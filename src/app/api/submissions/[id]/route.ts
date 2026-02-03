import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
  type AuthenticatedRequest,
} from "@/app/api/_middleware/auth";
import { submissionSchema } from "@/lib/validation/formSchemas";

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(
    { success: true, data, error: null },
    { status }
  );
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details } },
    { status }
  );
}

function canAccess(
  auth: AuthenticatedRequest,
  submissionUserId: string
): boolean {
  return auth.role === "admin" || auth.uid === submissionUserId;
}

// GET /api/submissions/[id] — get submission detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;

  try {
    const submissionDoc = await adminDb
      .collection("submissions")
      .doc(id)
      .get();

    if (!submissionDoc.exists) {
      return errorResponse(404, "NOT_FOUND", "Submission not found");
    }

    const submission = submissionDoc.data()!;
    if (!canAccess(authResult, submission.userId)) {
      return errorResponse(404, "NOT_FOUND", "Submission not found");
    }

    // Fetch subcollections
    const [imagesSnap, validationSnap, reviewsSnap] = await Promise.all([
      adminDb
        .collection("submissions")
        .doc(id)
        .collection("images")
        .orderBy("createdAt", "desc")
        .get(),
      adminDb
        .collection("submissions")
        .doc(id)
        .collection("validationResults")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      adminDb
        .collection("submissions")
        .doc(id)
        .collection("reviews")
        .orderBy("createdAt", "desc")
        .get(),
    ]);

    const images = imagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const validationResults = validationSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return jsonResponse({
      id: submissionDoc.id,
      ...submission,
      images,
      validationResults,
      reviews,
    });
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to fetch submission");
  }
}

// PUT /api/submissions/[id] — edit pending submission
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  // Extract expected version from body for optimistic locking
  const expectedVersion =
    typeof body === "object" && body !== null && "version" in body
      ? (body as Record<string, unknown>).version
      : undefined;

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid submission data",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const docRef = adminDb.collection("submissions").doc(id);
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        return { error: errorResponse(404, "NOT_FOUND", "Submission not found") };
      }

      const current = doc.data()!;

      // Must be the owner
      if (current.userId !== authResult.uid) {
        return {
          error: errorResponse(404, "NOT_FOUND", "Submission not found"),
        };
      }

      // Must be pending or needs_revision
      if (current.status !== "pending" && current.status !== "needs_revision") {
        return {
          error: errorResponse(
            400,
            "INVALID_STATUS",
            "Only pending or needs_revision submissions can be edited"
          ),
        };
      }

      // Must not be validating
      if (current.validationInProgress) {
        return {
          error: errorResponse(
            423,
            "VALIDATION_IN_PROGRESS",
            "Submission is being validated. Please wait."
          ),
        };
      }

      // Optimistic locking — version check
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        return {
          error: errorResponse(
            409,
            "VERSION_CONFLICT",
            "Submission was modified by another request. Please refresh."
          ),
        };
      }

      const newVersion = (current.version || 1) + 1;

      // Log history
      const historyRef = docRef.collection("history").doc();
      tx.set(historyRef, {
        version: current.version,
        changes: parsed.data,
        changedBy: authResult.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update submission
      const updateData: Record<string, unknown> = {
        ...parsed.data,
        countryOfOrigin: parsed.data.countryOfOrigin || null,
        fancifulName: parsed.data.fancifulName || null,
        grapeVarietals: parsed.data.grapeVarietals || null,
        appellationOfOrigin: parsed.data.appellationOfOrigin || null,
        vintageDate: parsed.data.vintageDate || null,
        version: newVersion,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // If needs_revision, change to pending (triggers revalidation)
      if (current.status === "needs_revision") {
        updateData.status = "pending";
      }

      tx.update(docRef, updateData);

      return { success: true, version: newVersion };
    });

    if ("error" in result) return result.error;

    return jsonResponse({ id, version: result.version });
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to update submission");
  }
}
