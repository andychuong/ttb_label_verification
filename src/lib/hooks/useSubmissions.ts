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
import { useAuth } from "@/lib/auth/context";
import type { ProductType, SubmissionStatus } from "@/types/submission";

export interface SubmissionListItem {
  id: string;
  serialNumber: string;
  brandName: string;
  productType: ProductType;
  status: SubmissionStatus;
  needsAttention: boolean;
  validationInProgress: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function useSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "submissions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SubmissionListItem[];
        setSubmissions(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useSubmissions error:", err);
        setError("Failed to load submissions");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { submissions, loading, error };
}
