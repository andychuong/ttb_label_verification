"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequireProfile } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/context";
import { db } from "@/lib/firebase/client";
import { uploadImage } from "@/lib/firebase/storage";
import { LoadingState } from "@/components/ui";
import type { SubmissionFormData } from "@/lib/validation/formSchemas";
import type { ImageEntry } from "@/types/submission";
import StepForm from "./step-form";
import StepUpload from "./step-upload";
import StepReview from "./step-review";

const STEPS = ["Application Form", "Label Image", "Review & Submit"] as const;

function NewSubmissionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<SubmissionFormData | null>(null);
  const [imageFiles, setImageFiles] = useState<ImageEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingDuplicate, setLoadingDuplicate] = useState(!!duplicateId);

  // Pre-fill form data when duplicating an existing submission
  useEffect(() => {
    if (!duplicateId || !user) return;

    let cancelled = false;

    async function fetchDuplicate() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch(`/api/submissions/${duplicateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.success && json.data) {
          const s = json.data;
          setFormData({
            productType: s.productType,
            source: s.source,
            serialNumber: s.serialNumber,
            brandName: s.brandName,
            fancifulName: s.fancifulName ?? "",
            classTypeDesignation: s.classTypeDesignation,
            alcoholContent: s.alcoholContent,
            netContents: s.netContents,
            nameAddressOnLabel: s.nameAddressOnLabel,
            countryOfOrigin: s.countryOfOrigin ?? "",
            grapeVarietals: s.grapeVarietals ?? "",
            appellationOfOrigin: s.appellationOfOrigin ?? "",
            vintageDate: s.vintageDate ?? "",
            healthWarningConfirmed: s.healthWarningConfirmed,
          });
        }
      } catch {
        // Silently fail — user can still fill the form manually
      } finally {
        if (!cancelled) setLoadingDuplicate(false);
      }
    }

    fetchDuplicate();
    return () => { cancelled = true; };
  }, [duplicateId, user]);

  const handleFormComplete = (data: SubmissionFormData) => {
    setFormData(data);
    setStep(1);
  };

  const handleUploadComplete = (files: ImageEntry[]) => {
    setImageFiles(files);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user || !formData || imageFiles.length === 0) return;
    setSubmitting(true);
    setError("");

    try {
      const token = await user.getIdToken();

      // 1. Create the submission in Firestore
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create submission.");
        setSubmitting(false);
        return;
      }

      const submissionId = json.data.id;

      // 2. Upload each image to Firebase Storage + create Firestore docs
      for (const entry of imageFiles) {
        const imageId = crypto.randomUUID();
        const { storagePath, downloadUrl } = await uploadImage(
          submissionId,
          imageId,
          entry.file
        );

        await setDoc(doc(db, "submissions", submissionId, "images", imageId), {
          imageType: entry.imageType,
          storagePath,
          downloadUrl,
          originalFilename: entry.file.name,
          mimeType: entry.file.type,
          fileSize: entry.file.size,
          createdAt: serverTimestamp(),
        });
      }

      // 3. Navigate to the submission detail page
      router.push(`/submissions/${submissionId}`);
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingDuplicate) {
    return (
      <RequireProfile>
        <div className="mx-auto max-w-4xl">
          <LoadingState message="Loading submission data..." />
        </div>
      </RequireProfile>
    );
  }

  return (
    <RequireProfile>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">New Submission</h1>

        {/* Step indicator */}
        <nav className="mt-6 mb-8">
          <ol className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    i < step
                      ? "bg-blue-600 text-white"
                      : i === step
                        ? "border-2 border-blue-600 text-blue-600"
                        : "border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {i < step ? "\u2713" : i + 1}
                </span>
                <span
                  className={`text-sm font-medium ${
                    i <= step ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="mx-2 h-px w-8 bg-gray-300" />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 0 && (
          <StepForm
            key={formData ? "prefilled" : "empty"}
            defaultValues={formData ?? undefined}
            onNext={handleFormComplete}
          />
        )}

        {step === 1 && (
          <StepUpload
            defaultFiles={imageFiles}
            onNext={handleUploadComplete}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && formData && imageFiles.length > 0 && (
          <StepReview
            formData={formData}
            imageFiles={imageFiles}
            submitting={submitting}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </RequireProfile>
  );
}

export default function NewSubmissionPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <NewSubmissionContent />
    </Suspense>
  );
}
