import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
  checkAdminRole,
} from "@/app/api/_middleware/auth";

function jsonResponse(
  data: unknown,
  pagination?: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    { success: true, data, error: null, pagination: pagination ?? null },
    { status }
  );
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details: {} } },
    { status }
  );
}

// GET /api/admin/submissions — list all submissions (admin only)
export async function GET(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const adminCheck = checkAdminRole(authResult);
  if (adminCheck) return adminCheck;

  const { searchParams } = new URL(req.url);
  const limitParam = Math.min(
    parseInt(searchParams.get("limit") || "20", 10),
    100
  );
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const productType = searchParams.get("productType");
  const needsAttention = searchParams.get("needsAttention");

  try {
    let q: FirebaseFirestore.Query = adminDb
      .collection("submissions")
      .orderBy("createdAt", "desc");

    if (status) {
      q = q.where("status", "==", status);
    }
    if (productType) {
      q = q.where("productType", "==", productType);
    }
    if (needsAttention === "true") {
      q = q.where("needsAttention", "==", true);
    }

    if (cursor) {
      const cursorDoc = await adminDb
        .collection("submissions")
        .doc(cursor)
        .get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snapshot = await q.limit(limitParam + 1).get();
    const hasMore = snapshot.docs.length > limitParam;
    const docs = hasMore ? snapshot.docs.slice(0, limitParam) : snapshot.docs;

    const submissions = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lastDoc = docs[docs.length - 1];

    return jsonResponse(submissions, {
      cursor: lastDoc?.id ?? null,
      hasMore,
    });
  } catch {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Failed to fetch submissions"
    );
  }
}
