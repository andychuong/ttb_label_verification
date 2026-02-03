"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ProductType, SubmissionStatus } from "@/types/submission";

export interface AdminSubmissionItem {
  id: string;
  userId: string;
  brandName: string;
  productType: ProductType;
  status: SubmissionStatus;
  needsAttention: boolean;
  validationInProgress: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function useAdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "submissions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as AdminSubmissionItem
        );
        setSubmissions(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useAdminSubmissions error:", err);
        setError("Failed to load submissions");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { submissions, loading, error };
}

export function useNeedsAttentionQueue() {
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "submissions"),
      where("needsAttention", "==", true),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as AdminSubmissionItem
        );
        setSubmissions(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useNeedsAttentionQueue error:", err);
        setError("Failed to load attention queue");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { submissions, loading, error };
}
