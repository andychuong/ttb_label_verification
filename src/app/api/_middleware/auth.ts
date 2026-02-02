import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthenticatedRequest {
  uid: string;
  email: string;
  role: "user" | "admin";
  token: DecodedIdToken;
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details: {} } },
    { status }
  );
}

export async function verifyFirebaseIdToken(
  req: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header"
    );
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || "",
      role: (decoded.role as "user" | "admin") || "user",
      token: decoded,
    };
  } catch {
    return errorResponse(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

export function checkAdminRole(
  authResult: AuthenticatedRequest
): NextResponse | null {
  if (authResult.role !== "admin") {
    return errorResponse(
      403,
      "FORBIDDEN",
      "Admin access required"
    );
  }
  return null;
}

export function isAuthError(
  result: AuthenticatedRequest | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
