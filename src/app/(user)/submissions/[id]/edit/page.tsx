"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequireProfile } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/context";
import { db } from "@/lib/firebase/client";
import { uploadImage } from "@/lib/firebase/storage";
import { useSubmission } from "@/lib/hooks/useSubmission";
import { ImageUploader } from "@/components/submission/ImageUploader";
import StepForm from "../../new/step-form";
import {
  Button,
  LoadingState,
  Card,
  CardHeader,
  Spinner,
} from "@/components/ui";
import type { SubmissionFormData } from "@/lib/validation/formSchemas";

export default function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { submission, images, loading, error } = useSubmission(id);

  const [newImage, setNewImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSave = async (formData: SubmissionFormData) => {
    if (!user || !submission) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const token = await user.getIdToken();

      // 1. Update submission form data
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, version: submission.version }),
      });

      const json = await res.json();
      if (!json.success) {
        setSubmitError(json.error?.message || "Failed to update submission.");
        setSubmitting(false);
        return;
      }

      // 2. If a new image was uploaded, upload it to Storage + create Firestore doc
      if (newImage) {
        const imageId = crypto.randomUUID();
        const { storagePath, downloadUrl } = await uploadImage(
          id,
          imageId,
          newImage
        );

        await setDoc(doc(db, "submissions", id, "images", imageId), {
          imageType: "brand_front",
          storagePath,
          downloadUrl,
          originalFilename: newImage.name,
          mimeType: newImage.type,
          fileSize: newImage.size,
          createdAt: serverTimestamp(),
        });
      }

      // 3. Navigate back to submission detail
      router.push(`/submissions/${id}`);
    } catch {
      setSubmitError("Failed to save changes. Please try again.");
      setSubmitting(false);
    }
  };

  const defaultValues: SubmissionFormData | undefined = submission
    ? {
        productType: submission.productType,
        source: submission.source,
        serialNumber: submission.serialNumber,
        brandName: submission.brandName,
        fancifulName: submission.fancifulName ?? "",
        classTypeDesignation: submission.classTypeDesignation,
        alcoholContent: submission.alcoholContent,
        netContents: submission.netContents,
        nameAddressOnLabel: submission.nameAddressOnLabel,
        countryOfOrigin: submission.countryOfOrigin ?? "",
        grapeVarietals: submission.grapeVarietals ?? "",
        appellationOfOrigin: submission.appellationOfOrigin ?? "",
        vintageDate: submission.vintageDate ?? "",
        healthWarningConfirmed: submission.healthWarningConfirmed,
      }
    : undefined;

  // Guard: can only edit pending submissions that aren't being validated
  const canEdit =
    submission?.status === "pending" && !submission?.validationInProgress;

  return (
    <RequireProfile>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Submission</h1>
          <Button
            variant="secondary"
            onClick={() => router.push(`/submissions/${id}`)}
          >
            Cancel
          </Button>
        </div>

        {loading && <LoadingState message="Loading submission..." />}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && submission && !canEdit && (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
            {submission.validationInProgress
              ? "This submission is currently being validated and cannot be edited."
              : "Only pending submissions can be edited."}
          </div>
        )}

        {!loading && !error && submission && canEdit && defaultValues && (
          <>
            {submitError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {submitting && (
              <div className="flex items-center gap-3 rounded-md bg-blue-50 p-4 text-sm text-blue-700">
                <Spinner className="h-4 w-4" />
                <span>Saving changes...</span>
              </div>
            )}

            {/* Current Image + Replace */}
            <Card>
              <CardHeader title="Label Image" />
              {images.length > 0 && !newImage && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-500">Current image:</p>
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[0].downloadUrl}
                      alt={images[0].originalFilename}
                      className="h-48 w-full object-contain bg-gray-50"
                    />
                  </div>
                </div>
              )}
              <ImageUploader
                value={newImage}
                onChange={setNewImage}
                error=""
              />
              {!newImage && images.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Leave empty to keep the current image.
                </p>
              )}
            </Card>

            {/* Form (reuses StepForm) */}
            <StepForm
              defaultValues={defaultValues}
              onNext={handleSave}
              submitLabel="Save Changes"
            />
          </>
        )}

        {!loading && !error && !submission && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">Submission not found.</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </RequireProfile>
  );
}
