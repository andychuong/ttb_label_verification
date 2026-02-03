import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyFirebaseIdToken,
  isAuthError,
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

// GET /api/submissions — list submissions for authenticated user
export async function GET(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const productType = searchParams.get("productType");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  try {
    let query = adminDb
      .collection("submissions")
      .where("userId", "==", authResult.uid)
      .orderBy("createdAt", "desc")
      .limit(limit + 1); // fetch one extra to determine hasMore

    if (status) {
      query = query.where("status", "==", status);
    }
    if (productType) {
      query = query.where("productType", "==", productType);
    }
    if (cursor) {
      const cursorDoc = await adminDb.collection("submissions").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const submissions = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return jsonResponse({
      submissions,
      pagination: {
        cursor: docs.length > 0 ? docs[docs.length - 1].id : null,
        hasMore,
      },
    });
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to fetch submissions");
  }
}

// POST /api/submissions — create new submission
export async function POST(req: NextRequest) {
  const authResult = await verifyFirebaseIdToken(req);
  if (isAuthError(authResult)) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

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
    const submissionData = {
      ...parsed.data,
      userId: authResult.uid,
      fancifulName: parsed.data.fancifulName || null,
      resubmissionTtbId: parsed.data.resubmissionTtbId || null,
      formulaNumber: parsed.data.formulaNumber || null,
      containerInfo: parsed.data.containerInfo || null,
      applicantNotes: parsed.data.applicantNotes || null,
      countryOfOrigin: parsed.data.countryOfOrigin || null,
      statementOfComposition: parsed.data.statementOfComposition || null,
      ageStatement: parsed.data.ageStatement || null,
      stateOfDistillation: parsed.data.stateOfDistillation || null,
      commodityStatement: parsed.data.commodityStatement || null,
      coloringMaterials: parsed.data.coloringMaterials || null,
      grapeVarietals: parsed.data.grapeVarietals || null,
      appellationOfOrigin: parsed.data.appellationOfOrigin || null,
      vintageDate: parsed.data.vintageDate || null,
      foreignWinePercentage: parsed.data.foreignWinePercentage || null,
      status: "pending",
      needsAttention: false,
      validationInProgress: false,
      version: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("submissions").add(submissionData);

    return jsonResponse({ id: docRef.id }, 201);
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to create submission");
  }
}
