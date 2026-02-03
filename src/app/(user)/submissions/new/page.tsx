"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequireProfile } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/context";
import { db } from "@/lib/firebase/client";
import { uploadImage } from "@/lib/firebase/storage";
import type { SubmissionFormData } from "@/lib/validation/formSchemas";
import StepForm from "./step-form";
import StepUpload from "./step-upload";
import StepReview from "./step-review";

const STEPS = ["Application Form", "Label Image", "Review & Submit"] as const;

export default function NewSubmissionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<SubmissionFormData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFormComplete = (data: SubmissionFormData) => {
    setFormData(data);
    setStep(1);
  };

  const handleUploadComplete = (file: File) => {
    setImageFile(file);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user || !formData || !imageFile) return;
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

      // 2. Upload image to Firebase Storage
      const imageId = crypto.randomUUID();
      const { storagePath, downloadUrl } = await uploadImage(
        submissionId,
        imageId,
        imageFile
      );

      // 3. Create image document in Firestore so the Cloud Function can find it
      await setDoc(doc(db, "submissions", submissionId, "images", imageId), {
        imageType: "brand_front",
        storagePath,
        downloadUrl,
        originalFilename: imageFile.name,
        mimeType: imageFile.type,
        fileSize: imageFile.size,
        createdAt: serverTimestamp(),
      });

      // 4. Navigate to the submission detail page
      router.push(`/submissions/${submissionId}`);
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

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
            defaultValues={formData ?? undefined}
            onNext={handleFormComplete}
          />
        )}

        {step === 1 && (
          <StepUpload
            defaultFile={imageFile}
            onNext={handleUploadComplete}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && formData && imageFile && (
          <StepReview
            formData={formData}
            imageFile={imageFile}
            submitting={submitting}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </RequireProfile>
  );
}
