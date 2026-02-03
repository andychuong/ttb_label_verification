"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function ImageUploader({ value, onChange, error }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "File must be JPEG, PNG, WebP, or TIFF.";
    }
    if (file.size > MAX_SIZE) {
      return "File must be under 10 MB.";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setValidationError(err);
        onChange(null);
      } else {
        setValidationError("");
        onChange(file);
      }
    },
    [validate, onChange]
  );

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const previewUrl = value ? URL.createObjectURL(value) : null;
  const displayError = error || validationError;

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : displayError
              ? "border-red-300 bg-red-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or
          drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">
          JPEG, PNG, WebP, or TIFF (max 10 MB)
        </p>
      </div>

      {displayError && (
        <p className="text-xs text-red-600">{displayError}</p>
      )}

      {previewUrl && value && (
        <div className="flex items-center gap-4 rounded-md border border-gray-200 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="h-20 w-20 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {value.name}
            </p>
            <p className="text-xs text-gray-500">
              {(value.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
