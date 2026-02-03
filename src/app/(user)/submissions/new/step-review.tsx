"use client";

import { useMemo } from "react";
import type { SubmissionFormData } from "@/lib/validation/formSchemas";
import type { ImageEntry, ImageType } from "@/types/submission";
import { Button } from "@/components/ui";

const productTypeLabels: Record<string, string> = {
  distilled_spirits: "Distilled Spirits",
  wine: "Wine",
  malt_beverage: "Malt Beverage",
};

const imageTypeLabels: Record<ImageType, string> = {
  brand_front: "Front Label",
  back: "Back Label",
  other: "Other",
};

interface StepReviewProps {
  formData: SubmissionFormData;
  imageFiles: ImageEntry[];
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function StepReview({
  formData,
  imageFiles,
  submitting,
  onSubmit,
  onBack,
}: StepReviewProps) {
  const previewUrls = useMemo(
    () => imageFiles.map((entry) => ({
      url: URL.createObjectURL(entry.file),
      imageType: entry.imageType,
      name: entry.file.name,
      size: entry.file.size,
    })),
    [imageFiles]
  );

  return (
    <div className="space-y-6 rounded-lg bg-white p-8 shadow">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          Review Your Submission
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Please review all information before submitting.
        </p>
      </div>

      {/* Product Info */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
          Product Information
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Product Type"
            value={productTypeLabels[formData.productType]}
          />
          <Field
            label="Source"
            value={formData.source === "domestic" ? "Domestic" : "Imported"}
          />
          <Field label="Serial Number" value={formData.serialNumber} />
          <Field label="Brand Name" value={formData.brandName} />
          <Field label="Fanciful Name" value={formData.fancifulName} />
          <Field
            label="Class/Type Designation"
            value={formData.classTypeDesignation}
          />
          <Field
            label="Alcohol Content"
            value={formData.alcoholContent ? `${formData.alcoholContent}%` : null}
          />
          <Field label="Net Contents" value={formData.netContents} />
          <Field
            label="Name & Address on Label"
            value={formData.nameAddressOnLabel}
          />
          <Field label="Country of Origin" value={formData.countryOfOrigin} />
        </dl>
      </div>

      {/* Wine Details (conditional) */}
      {formData.productType === "wine" &&
        (formData.grapeVarietals ||
          formData.appellationOfOrigin ||
          formData.vintageDate) && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
              Wine Details
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Grape Varietals" value={formData.grapeVarietals} />
              <Field
                label="Appellation of Origin"
                value={formData.appellationOfOrigin}
              />
              <Field label="Vintage Year" value={formData.vintageDate} />
            </dl>
          </div>
        )}

      {/* Confirmation */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
          Confirmation
        </h3>
        <p className="text-sm text-gray-900">
          {formData.healthWarningConfirmed
            ? "Health warning statement confirmed"
            : "Health warning statement NOT confirmed"}
        </p>
      </div>

      {/* Image previews */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
          Label Images
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previewUrls.map((preview) => (
            <div
              key={preview.imageType}
              className="rounded-md border border-gray-200 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={`${imageTypeLabels[preview.imageType]} preview`}
                className="mb-2 h-32 w-full rounded object-cover"
              />
              <p className="text-xs font-medium text-gray-500">
                {imageTypeLabels[preview.imageType]}
              </p>
              <p className="truncate text-sm font-medium text-gray-900">
                {preview.name}
              </p>
              <p className="text-xs text-gray-500">
                {(preview.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={submitting} onClick={onSubmit}>
          {submitting ? "Submitting..." : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  );
}
