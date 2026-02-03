"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/submission/ImageUploader";
import { Button } from "@/components/ui";

interface StepUploadProps {
  defaultFile: File | null;
  onNext: (file: File) => void;
  onBack: () => void;
}

export default function StepUpload({
  defaultFile,
  onNext,
  onBack,
}: StepUploadProps) {
  const [file, setFile] = useState<File | null>(defaultFile);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!file) {
      setError("Please upload a label image before continuing.");
      return;
    }
    setError("");
    onNext(file);
  };

  return (
    <div className="space-y-6 rounded-lg bg-white p-8 shadow">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          Upload Label Image
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a photo of your product label. The image will be analyzed by AI
          to verify it matches your application form data.
        </p>
      </div>

      <ImageUploader value={file} onChange={setFile} error={error} />

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Next: Review & Submit
        </Button>
      </div>
    </div>
  );
}
