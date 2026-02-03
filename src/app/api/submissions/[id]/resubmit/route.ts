import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
} from "@/app/api/_middleware/auth";

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(
    { success: true, data, error: null },
    { status }
  );
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details: {} } },
    { status }
  );
}

// POST /api/submissions/[id]/resubmit — resubmit after needs_revision
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;

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

      // Must be needs_revision
      if (current.status !== "needs_revision") {
        return {
          error: errorResponse(
            400,
            "INVALID_STATUS",
            "Only submissions with 'Needs Revision' status can be resubmitted"
          ),
        };
      }

      const newVersion = (current.version || 1) + 1;

      // Log history
      const historyRef = docRef.collection("history").doc();
      tx.set(historyRef, {
        version: current.version,
        changes: { action: "resubmit" },
        changedBy: authResult.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Reset status to pending, increment version
      tx.update(docRef, {
        status: "pending",
        needsAttention: false,
        validationInProgress: false,
        version: newVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, version: newVersion };
    });

    if ("error" in result) return result.error;

    return jsonResponse({ id, version: result.version });
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to resubmit");
  }
}
