import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserMessage, type FormDataForPrompt } from "./prompt";

initializeApp();

const db = getFirestore();
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Tier 1 critical field names — all must pass for auto-approval
const TIER1_FIELDS = [
  "brandName",
  "classTypeDesignation",
  "alcoholContent",
  "netContents",
  "healthWarning",
  "nameAndAddress",
];

// --- Types ---

interface ValidationResponse {
  extractedText: string;
  fieldResults: Array<{
    fieldName: string;
    formValue: string;
    labelValue: string;
    matchStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" | "NOT_APPLICABLE";
    notes: string;
  }>;
  complianceWarnings: Array<{
    check: string;
    message: string;
    severity: "info" | "warning" | "error";
  }>;
  overallPass: boolean;
  confidence: "high" | "medium" | "low";
}

// --- Helpers ---

/** Retry with exponential backoff (1s, 2s, 4s) */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `Attempt ${attempt + 1}/${maxAttempts} failed: ${lastError.message}`
      );
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/** Extract form fields relevant to the GPT-4o prompt */
function buildFormData(
  data: FirebaseFirestore.DocumentData
): FormDataForPrompt {
  return {
    productType: data.productType,
    source: data.source,
    serialNumber: data.serialNumber,
    brandName: data.brandName,
    fancifulName: data.fancifulName || null,
    classTypeDesignation: data.classTypeDesignation,
    alcoholContent: data.alcoholContent,
    netContents: data.netContents,
    nameAddressOnLabel: data.nameAddressOnLabel,
    countryOfOrigin: data.countryOfOrigin || null,
    grapeVarietals: data.grapeVarietals || null,
    appellationOfOrigin: data.appellationOfOrigin || null,
    vintageDate: data.vintageDate || null,
  };
}

/** Call GPT-4o-mini Vision API for label validation */
async function callGpt4oValidation(
  apiKey: string,
  formData: FormDataForPrompt,
  imageUrl: string
): Promise<ValidationResponse> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildUserMessage(formData) },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "auto",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from GPT-4o-mini");
  }

  const parsed = JSON.parse(content) as ValidationResponse;

  if (!parsed.extractedText && parsed.extractedText !== "") {
    throw new Error("Invalid response: missing extractedText");
  }
  if (!Array.isArray(parsed.fieldResults)) {
    throw new Error("Invalid response: missing fieldResults array");
  }

  return parsed;
}

/** Determine submission status from validation results */
function determineOutcome(result: ValidationResponse): {
  status: string;
  needsAttention: boolean;
} {
  // Low confidence → always flag for admin review
  if (result.confidence === "low") {
    return { status: "pending", needsAttention: true };
  }

  // Check all Tier 1 fields pass
  const tier1Results = result.fieldResults.filter((fr) =>
    TIER1_FIELDS.includes(fr.fieldName)
  );
  const allTier1Pass = tier1Results.every(
    (fr) => fr.matchStatus === "MATCH" || fr.matchStatus === "NOT_APPLICABLE"
  );

  if (result.overallPass && allTier1Pass) {
    return { status: "approved", needsAttention: false };
  }

  return { status: "pending", needsAttention: true };
}

// --- Core Validation Logic ---

/**
 * Run the AI validation pipeline for a submission.
 * Shared by both onCreate and onUpdate (resubmit) triggers.
 */
async function runValidation(
  submissionId: string,
  submissionData: FirebaseFirestore.DocumentData,
  expectedVersion: number,
  imageUrl?: string
): Promise<void> {
  const docRef = db.collection("submissions").doc(submissionId);

  try {
    // Mark validation in progress
    await docRef.update({ validationInProgress: true });

    // Resolve image URL
    let resolvedImageUrl = imageUrl;

    if (!resolvedImageUrl) {
      // Called from onSubmissionUpdated — images already exist, read directly
      const imagesSnap = await docRef
        .collection("images")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (imagesSnap.empty) {
        console.warn(`No images found for submission ${submissionId}`);
        await docRef.update({
          validationInProgress: false,
          needsAttention: true,
        });
        await docRef.collection("validationResults").add({
          extractedText: "",
          fieldResults: [],
          complianceWarnings: [
            {
              check: "image_present",
              message:
                "No label image was found for this submission. Upload an image and resubmit.",
              severity: "error",
            },
          ],
          overallPass: false,
          confidence: "low",
          rawAiResponse: {},
          processedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      resolvedImageUrl = imagesSnap.docs[0].data().downloadUrl as string;
    }

    if (!resolvedImageUrl) {
      throw new Error("Image document missing downloadUrl");
    }

    // Build form data for the prompt
    const formData = buildFormData(submissionData);

    // Call GPT-4o-mini with retry (3 attempts, exponential backoff)
    const apiKey = openaiApiKey.value();
    const result = await withRetry(
      () => callGpt4oValidation(apiKey, formData, resolvedImageUrl!),
      3,
      1000
    );

    // Version check — discard results if submission was modified during validation
    const freshDoc = await docRef.get();
    if (!freshDoc.exists) {
      console.warn(`Submission ${submissionId} deleted during validation`);
      return;
    }
    const freshData = freshDoc.data()!;
    if (freshData.version !== expectedVersion) {
      console.log(
        `Submission ${submissionId} version changed ` +
          `(${expectedVersion} → ${freshData.version}). Discarding stale results.`
      );
      await docRef.update({ validationInProgress: false });
      return;
    }

    // Determine outcome
    const outcome = determineOutcome(result);

    // Write validation results + update submission status in parallel
    await Promise.all([
      docRef.collection("validationResults").add({
        extractedText: result.extractedText,
        fieldResults: result.fieldResults,
        complianceWarnings: result.complianceWarnings,
        overallPass: result.overallPass,
        confidence: result.confidence,
        rawAiResponse: result as unknown as Record<string, unknown>,
        processedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }),
      docRef.update({
        status: outcome.status,
        needsAttention: outcome.needsAttention,
        validationInProgress: false,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    console.log(
      `Validation complete for ${submissionId}: ` +
        `status=${outcome.status}, needsAttention=${outcome.needsAttention}, ` +
        `confidence=${result.confidence}`
    );
  } catch (err) {
    console.error(`Validation failed for submission ${submissionId}:`, err);

    // Flag for admin review on failure
    try {
      await docRef.update({
        validationInProgress: false,
        needsAttention: true,
      });

      await docRef.collection("validationResults").add({
        extractedText: "",
        fieldResults: [],
        complianceWarnings: [
          {
            check: "system_error",
            message: `Validation failed: ${
              err instanceof Error ? err.message : "Unknown error"
            }. Flagged for admin review.`,
            severity: "error",
          },
        ],
        overallPass: false,
        confidence: "low",
        rawAiResponse: {
          error: err instanceof Error ? err.message : String(err),
        },
        processedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (updateErr) {
      console.error(
        "Failed to update submission after validation error:",
        updateErr
      );
    }
  }
}

// --- Cloud Functions ---

/**
 * onImageCreated
 *
 * Firestore onCreate trigger on submissions/{submissionId}/images/{imageId}.
 * Starts AI validation immediately when an image is uploaded.
 * Deduplication: if validationInProgress is already true (e.g., second image
 * uploaded while first is being processed), this trigger exits early.
 */
export const onImageCreated = onDocumentCreated(
  {
    document: "submissions/{submissionId}/images/{imageId}",
    secrets: [openaiApiKey],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const submissionId = event.params.submissionId;
    const imageData = snapshot.data();
    const imageUrl = imageData.downloadUrl as string;

    if (!imageUrl) {
      console.warn(
        `Image doc missing downloadUrl for submission ${submissionId}`
      );
      return;
    }

    // Read parent submission
    const docRef = db.collection("submissions").doc(submissionId);
    const submissionDoc = await docRef.get();

    if (!submissionDoc.exists) {
      console.warn(`Parent submission ${submissionId} not found`);
      return;
    }

    const submissionData = submissionDoc.data()!;

    // Deduplication: skip if validation is already running
    if (submissionData.validationInProgress) {
      console.log(
        `Validation already in progress for ${submissionId}, skipping`
      );
      return;
    }

    const version = submissionData.version || 1;

    console.log(
      `Image uploaded for submission ${submissionId} (version ${version}), starting validation`
    );
    await runValidation(submissionId, submissionData, version, imageUrl);
  }
);

/**
 * onSubmissionUpdated
 *
 * Firestore onUpdate trigger on submissions/{id}.
 * Re-triggers validation when:
 *   1. Resubmit: needs_revision → pending
 *   2. Edit: pending → pending with version bump (and not currently validating)
 * Internal writes (validationInProgress, needsAttention) don't bump version,
 * so they won't cause infinite trigger loops.
 */
export const onSubmissionUpdated = onDocumentUpdated(
  {
    document: "submissions/{id}",
    secrets: [openaiApiKey],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const submissionId = event.params.id;

    const isResubmit =
      before.status === "needs_revision" && after.status === "pending";

    const isEdit =
      before.status === "pending" &&
      after.status === "pending" &&
      after.version > before.version &&
      !after.validationInProgress;

    if (!isResubmit && !isEdit) return;

    const reason = isResubmit ? "Resubmission" : "Edit";
    console.log(
      `${reason} detected for ${submissionId} (version ${after.version})`
    );
    await runValidation(submissionId, after, after.version);
  }
);

/**
 * setAdminClaim
 *
 * Callable Cloud Function to grant admin role to a user.
 * Can only be called by an existing admin.
 */
export const setAdminClaim = onCall(async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  // Must be an existing admin
  if (request.auth.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can grant admin access"
    );
  }

  const { uid } = request.data as { uid: string };
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "Must provide a valid uid");
  }

  // Set custom claims on the Auth user
  const auth = getAuth();
  await auth.setCustomUserClaims(uid, { role: "admin" });

  // Also update Firestore profile if it exists
  const profileRef = db.collection("users").doc(uid);
  const profileDoc = await profileRef.get();
  if (profileDoc.exists) {
    await profileRef.update({ role: "admin" });
  }

  console.log(`Admin claim set for user ${uid} by ${request.auth.uid}`);
  return { success: true, uid };
});
