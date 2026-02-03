import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
  checkAdminRole,
} from "@/app/api/_middleware/auth";

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

const VALID_ACTIONS = ["approved", "needs_revision", "rejected"] as const;
type ReviewAction = (typeof VALID_ACTIONS)[number];

// POST /api/admin/submissions/[id]/review — submit admin review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const adminCheck = checkAdminRole(authResult);
  if (adminCheck) return adminCheck;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON"
    );
  }

  const action = body.action as string;
  const feedbackToUser = (body.feedbackToUser as string) || null;
  const internalNotes = (body.internalNotes as string) || null;

  // Validate action
  if (!VALID_ACTIONS.includes(action as ReviewAction)) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      `Action must be one of: ${VALID_ACTIONS.join(", ")}`
    );
  }

  // Feedback required for needs_revision
  if (action === "needs_revision" && !feedbackToUser?.trim()) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Feedback to user is required when requesting revision"
    );
  }

  // Reason required for rejection
  if (action === "rejected" && !feedbackToUser?.trim()) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Rejection reason is required"
    );
  }

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const docRef = adminDb.collection("submissions").doc(id);
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        return {
          error: errorResponse(404, "NOT_FOUND", "Submission not found"),
        };
      }

      const current = doc.data()!;

      // Cannot review if validation is in progress
      if (current.validationInProgress) {
        return {
          error: errorResponse(
            423,
            "VALIDATION_IN_PROGRESS",
            "Cannot review while validation is in progress"
          ),
        };
      }

      // Write review document
      const reviewRef = docRef.collection("reviews").doc();
      tx.set(reviewRef, {
        adminId: authResult.uid,
        action,
        feedbackToUser,
        internalNotes,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Log history
      const historyRef = docRef.collection("history").doc();
      tx.set(historyRef, {
        version: current.version,
        changes: {
          action: "admin_review",
          reviewAction: action,
        },
        changedBy: authResult.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update submission status
      tx.update(docRef, {
        status: action,
        needsAttention: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, reviewId: reviewRef.id };
    });

    if ("error" in result) return result.error;

    return jsonResponse(
      { id, reviewId: result.reviewId },
      201
    );
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to submit review");
  }
}
