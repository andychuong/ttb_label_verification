"use client";

import { ImageUploader } from "./ImageUploader";
import type { ImageType, ImageEntry } from "@/types/submission";

const imageTypeLabels: Record<ImageType, string> = {
  brand_front: "Front Label",
  back: "Back Label",
  other: "Other",
};

interface MultiImageUploaderProps {
  value: ImageEntry[];
  onChange: (entries: ImageEntry[]) => void;
}

export function MultiImageUploader({ value, onChange }: MultiImageUploaderProps) {
  const frontFile = value.find((e) => e.imageType === "brand_front")?.file ?? null;
  const backFile = value.find((e) => e.imageType === "back")?.file ?? null;
  const otherFile = value.find((e) => e.imageType === "other")?.file ?? null;

  const handleSlotChange = (imageType: ImageType, file: File | null) => {
    const filtered = value.filter((e) => e.imageType !== imageType);
    if (file) {
      filtered.push({ file, imageType });
    }
    onChange(filtered);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {imageTypeLabels.brand_front}{" "}
          <span className="text-red-500">*</span>
        </label>
        <ImageUploader
          value={frontFile}
          onChange={(file) => handleSlotChange("brand_front", file)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {imageTypeLabels.back}{" "}
          <span className="text-gray-400">(optional)</span>
        </label>
        <ImageUploader
          value={backFile}
          onChange={(file) => handleSlotChange("back", file)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {imageTypeLabels.other}{" "}
          <span className="text-gray-400">(optional)</span>
        </label>
        <ImageUploader
          value={otherFile}
          onChange={(file) => handleSlotChange("other", file)}
        />
      </div>
    </div>
  );
}
