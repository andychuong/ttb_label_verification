"use client";

import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  ProductType,
  ProductSource,
  SubmissionStatus,
  ApplicationType,
  ImageType,
  ReviewAction,
} from "@/types/submission";
import type {
  FieldResult,
  ComplianceWarning,
  Confidence,
} from "@/types/validation";

export interface SubmissionDetail {
  id: string;
  userId: string;
  serialNumber: string;
  productType: ProductType;
  source: ProductSource;
  brandName: string;
  fancifulName: string | null;
  classTypeDesignation: string;
  statementOfComposition: string | null;
  alcoholContent: string;
  netContents: string;
  nameAddressOnLabel: string;
  applicationType: ApplicationType[];
  resubmissionTtbId: string | null;
  formulaNumber: string | null;
  containerInfo: string | null;
  grapeVarietals: string | null;
  appellationOfOrigin: string | null;
  vintageDate: string | null;
  countryOfOrigin: string | null;
  ageStatement: string | null;
  stateOfDistillation: string | null;
  commodityStatement: string | null;
  coloringMaterials: string | null;
  fdncYellow5: boolean;
  cochinealCarmine: boolean;
  sulfiteDeclaration: boolean;
  healthWarningConfirmed: boolean;
  foreignWinePercentage: string | null;
  applicantNotes: string | null;
  status: SubmissionStatus;
  needsAttention: boolean;
  validationInProgress: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubmissionImageDoc {
  id: string;
  imageType: ImageType;
  storagePath: string;
  downloadUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: Timestamp;
}

export interface ValidationResultDoc {
  id: string;
  extractedText: string;
  fieldResults: FieldResult[];
  complianceWarnings: ComplianceWarning[];
  overallPass: boolean;
  confidence: Confidence;
  rawAiResponse: Record<string, unknown>;
  processedAt: Timestamp;
  createdAt: Timestamp;
}

export interface ReviewDoc {
  id: string;
  adminId: string;
  action: ReviewAction;
  feedbackToUser: string | null;
  internalNotes: string | null;
  createdAt: Timestamp;
}

export function useSubmission(submissionId: string | null) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [images, setImages] = useState<SubmissionImageDoc[]>([]);
  const [validationResults, setValidationResults] = useState<
    ValidationResultDoc[]
  >([]);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, "submissions", submissionId);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= 4) setLoading(false);
    };

    // Listen to main document
    const unsubDoc = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setSubmission({
            id: snap.id,
            ...snap.data(),
          } as SubmissionDetail);
          setError(null);
        } else {
          setSubmission(null);
          setError("Submission not found");
        }
        markLoaded();
      },
      (err) => {
        console.error("useSubmission doc error:", err);
        setError("Failed to load submission");
        markLoaded();
      }
    );

    // Listen to images subcollection
    const imagesQuery = query(
      collection(db, "submissions", submissionId, "images"),
      orderBy("createdAt", "desc")
    );
    const unsubImages = onSnapshot(
      imagesQuery,
      (snap) => {
        setImages(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as SubmissionImageDoc
          )
        );
        markLoaded();
      },
      () => markLoaded()
    );

    // Listen to latest validationResult
    const valQuery = query(
      collection(db, "submissions", submissionId, "validationResults"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsubVal = onSnapshot(
      valQuery,
      (snap) => {
        setValidationResults(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as ValidationResultDoc
          )
        );
        markLoaded();
      },
      () => markLoaded()
    );

    // Listen to reviews
    const reviewsQuery = query(
      collection(db, "submissions", submissionId, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsubReviews = onSnapshot(
      reviewsQuery,
      (snap) => {
        setReviews(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewDoc)
        );
        markLoaded();
      },
      () => markLoaded()
    );

    return () => {
      unsubDoc();
      unsubImages();
      unsubVal();
      unsubReviews();
    };
  }, [submissionId]);

  return { submission, images, validationResults, reviews, loading, error };
}
