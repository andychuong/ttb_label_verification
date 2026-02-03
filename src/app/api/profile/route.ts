import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
} from "@/app/api/_middleware/auth";
import { userProfileSchema } from "@/lib/validation/formSchemas";

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

export async function GET(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  try {
    const userDoc = await adminDb
      .collection("users")
      .doc(authResult.uid)
      .get();

    if (!userDoc.exists) {
      return jsonResponse({
        email: authResult.email,
        profileComplete: false,
      });
    }

    return jsonResponse(userDoc.data());
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to fetch profile");
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = userProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid profile data",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  try {
    const userRef = adminDb.collection("users").doc(authResult.uid);
    const userDoc = await userRef.get();

    const profileData = {
      ...parsed.data,
      email: authResult.email,
      mailingAddress: parsed.data.mailingAddress || null,
      representativeId: parsed.data.representativeId || null,
      role: userDoc.exists ? (userDoc.data()?.role ?? "user") : "user",
      profileComplete: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(userDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    await userRef.set(profileData, { merge: true });

    return jsonResponse(profileData);
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to update profile");
  }
}
