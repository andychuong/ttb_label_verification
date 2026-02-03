import { NextRequest, NextResponse } from "next/server";
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

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details: {} } },
    { status }
  );
}

// GET /api/admin/stats — dashboard summary statistics
export async function GET(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const adminCheck = checkAdminRole(authResult);
  if (adminCheck) return adminCheck;

  try {
    const snapshot = await adminDb.collection("submissions").get();

    let total = 0;
    let pending = 0;
    let approved = 0;
    let needsRevision = 0;
    let rejected = 0;
    let needsAttention = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      total++;
      switch (data.status) {
        case "pending":
          pending++;
          break;
        case "approved":
          approved++;
          break;
        case "needs_revision":
          needsRevision++;
          break;
        case "rejected":
          rejected++;
          break;
      }
      if (data.needsAttention) {
        needsAttention++;
      }
    });

    return jsonResponse({
      total,
      pending,
      approved,
      needsRevision,
      rejected,
      needsAttention,
    });
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to fetch stats");
  }
}
