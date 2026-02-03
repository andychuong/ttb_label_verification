"use client";

import { useState } from "react";
import { MultiImageUploader } from "@/components/submission/MultiImageUploader";
import { Button } from "@/components/ui";
import type { ImageEntry } from "@/types/submission";

interface StepUploadProps {
  defaultFiles: ImageEntry[];
  onNext: (files: ImageEntry[]) => void;
  onBack: () => void;
}

export default function StepUpload({
  defaultFiles,
  onNext,
  onBack,
}: StepUploadProps) {
  const [files, setFiles] = useState<ImageEntry[]>(defaultFiles);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!files.some((e) => e.imageType === "brand_front")) {
      setError("Please upload a front label image before continuing.");
      return;
    }
    setError("");
    onNext(files);
  };

  return (
    <div className="space-y-6 rounded-lg bg-white p-8 shadow">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          Upload Label Images
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload photos of your product labels. The front label is required and
          will be analyzed by AI to verify it matches your application form data.
          You may optionally include back and other label images.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <MultiImageUploader value={files} onChange={setFiles} />

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Next: Review &amp; Submit
        </Button>
      </div>
    </div>
  );
}
