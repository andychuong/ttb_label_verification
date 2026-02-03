import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
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

/** Retry with exponential backoff (2s, 4s, 8s) */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000
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

/** Download image from Cloud Storage and return base64 + MIME type */
async function fetchImageAsBase64(
  storagePath: string
): Promise<{ base64: string; mimeType: string }> {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const mimeType = (metadata.contentType as string) || "image/jpeg";
  return { base64: buffer.toString("base64"), mimeType };
}

/** Extract form fields relevant to the GPT-4o prompt */
function buildFormData(
  data: FirebaseFirestore.DocumentData
): FormDataForPrompt {
  return {
    productType: data.productType,
    source: data.source,
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
    ageStatement: data.ageStatement || null,
    stateOfDistillation: data.stateOfDistillation || null,
    commodityStatement: data.commodityStatement || null,
    coloringMaterials: data.coloringMaterials || null,
    statementOfComposition: data.statementOfComposition || null,
    fdncYellow5: data.fdncYellow5 || false,
    cochinealCarmine: data.cochinealCarmine || false,
    sulfiteDeclaration: data.sulfiteDeclaration || false,
  };
}

/** Call GPT-4o Vision API for label validation */
async function callGpt4oValidation(
  apiKey: string,
  formData: FormDataForPrompt,
  imageBase64: string,
  imageMimeType: string
): Promise<ValidationResponse> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildUserMessage(formData) },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from GPT-4o");
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
  expectedVersion: number
): Promise<void> {
  const docRef = db.collection("submissions").doc(submissionId);

  try {
    // Mark validation in progress
    await docRef.update({ validationInProgress: true });

    // Poll for images (they may be uploaded shortly after document creation)
    let imagesSnap: FirebaseFirestore.QuerySnapshot | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      imagesSnap = await docRef
        .collection("images")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();
      if (!imagesSnap.empty) break;
    }

    if (!imagesSnap || imagesSnap.empty) {
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

    // Use the first (most recent) image as the primary label
    const imageDoc = imagesSnap.docs[0];
    const imageData = imageDoc.data();
    const storagePath = imageData.storagePath as string;

    if (!storagePath) {
      throw new Error("Image document missing storagePath");
    }

    // Download image from Cloud Storage
    const { base64, mimeType } = await fetchImageAsBase64(storagePath);

    // Validate image size (reject >20MB)
    const imageSizeBytes = Buffer.from(base64, "base64").length;
    if (imageSizeBytes > 20 * 1024 * 1024) {
      throw new Error("Image file exceeds 20MB limit");
    }

    // Build form data for the prompt
    const formData = buildFormData(submissionData);

    // Call GPT-4o with retry (3 attempts, exponential backoff)
    const apiKey = openaiApiKey.value();
    const result = await withRetry(
      () => callGpt4oValidation(apiKey, formData, base64, mimeType),
      3,
      2000
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

    // Write validation results to subcollection
    await docRef.collection("validationResults").add({
      extractedText: result.extractedText,
      fieldResults: result.fieldResults,
      complianceWarnings: result.complianceWarnings,
      overallPass: result.overallPass,
      confidence: result.confidence,
      rawAiResponse: result as unknown as Record<string, unknown>,
      processedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update submission status
    await docRef.update({
      status: outcome.status,
      needsAttention: outcome.needsAttention,
      validationInProgress: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

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
 * onSubmissionCreated
 *
 * Firestore onCreate trigger on submissions/{id}.
 * Starts the AI validation pipeline when a new submission is created.
 * Polls briefly for images since they're uploaded after document creation.
 */
export const onSubmissionCreated = onDocumentCreated(
  {
    document: "submissions/{id}",
    secrets: [openaiApiKey],
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const submissionId = event.params.id;
    const data = snapshot.data();
    const version = data.version || 1;

    console.log(
      `New submission created: ${submissionId} (version ${version})`
    );
    await runValidation(submissionId, data, version);
  }
);

/**
 * onSubmissionUpdated
 *
 * Firestore onUpdate trigger on submissions/{id}.
 * Detects resubmissions (needs_revision → pending) and re-triggers validation.
 * Stale validation results are handled by version checks within runValidation.
 */
export const onSubmissionUpdated = onDocumentUpdated(
  {
    document: "submissions/{id}",
    secrets: [openaiApiKey],
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const submissionId = event.params.id;

    // Only re-trigger validation on resubmit (needs_revision → pending).
    // All other updates (validation writes, edits, etc.) are ignored
    // to prevent infinite trigger loops.
    const isResubmit =
      before.status === "needs_revision" && after.status === "pending";

    if (!isResubmit) return;

    console.log(
      `Resubmission detected for ${submissionId} (version ${after.version})`
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
