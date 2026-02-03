"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequireProfile } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/context";
import { db } from "@/lib/firebase/client";
import { uploadImage } from "@/lib/firebase/storage";
import { useSubmission } from "@/lib/hooks/useSubmission";
import { MultiImageUploader } from "@/components/submission/MultiImageUploader";
import StepForm from "../../new/step-form";
import {
  Button,
  LoadingState,
  Card,
  CardHeader,
  Spinner,
} from "@/components/ui";
import type { SubmissionFormData } from "@/lib/validation/formSchemas";
import type { ImageEntry, ImageType } from "@/types/submission";

const imageTypeLabels: Record<ImageType, string> = {
  brand_front: "Front Label",
  back: "Back Label",
  other: "Other",
};

export default function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { submission, images, loading, error } = useSubmission(id);

  const [newImages, setNewImages] = useState<ImageEntry[]>([]);
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

      // 2. Upload any new images to Storage + create Firestore docs
      for (const entry of newImages) {
        const imageId = crypto.randomUUID();
        const { storagePath, downloadUrl } = await uploadImage(
          id,
          imageId,
          entry.file
        );

        await setDoc(doc(db, "submissions", id, "images", imageId), {
          imageType: entry.imageType,
          storagePath,
          downloadUrl,
          originalFilename: entry.file.name,
          mimeType: entry.file.type,
          fileSize: entry.file.size,
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

  // Guard: can edit pending or needs_revision submissions (not while validating)
  const canEdit =
    (submission?.status === "pending" ||
      submission?.status === "needs_revision") &&
    !submission?.validationInProgress;
  const isRevision = submission?.status === "needs_revision";

  return (
    <RequireProfile>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {isRevision ? "Revise & Resubmit" : "Edit Submission"}
          </h1>
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
              : "Only pending or needs revision submissions can be edited."}
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

            {/* Current Images */}
            {images.length > 0 && (
              <Card>
                <CardHeader title="Current Images" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((img) => (
                    <div
                      key={img.storagePath}
                      className="rounded-md border border-gray-200 p-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.downloadUrl}
                        alt={img.originalFilename}
                        className="mb-2 h-32 w-full rounded object-cover bg-gray-50"
                      />
                      <p className="text-xs font-medium text-gray-500">
                        {imageTypeLabels[img.imageType] ?? img.imageType}
                      </p>
                      <p className="truncate text-sm text-gray-900">
                        {img.originalFilename}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upload New / Replacement Images */}
            <Card>
              <CardHeader title="Upload New Images" />
              <MultiImageUploader value={newImages} onChange={setNewImages} />
              {newImages.length === 0 && images.length > 0 && (
                <p className="mt-3 text-xs text-gray-400">
                  Leave empty to keep the current images. New images of the same
                  type will be added alongside existing ones.
                </p>
              )}
            </Card>

            {/* Form (reuses StepForm) */}
            <StepForm
              defaultValues={defaultValues}
              onNext={handleSave}
              submitLabel={isRevision ? "Resubmit" : "Save Changes"}
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
