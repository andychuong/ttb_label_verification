"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { useSubmission } from "@/lib/hooks/useSubmission";
import { ValidationResultsPanel } from "@/components/submission/ValidationResultsPanel";
import { ReviewActionPanel } from "@/components/admin/ReviewActionPanel";
import { AiReportViewer } from "@/components/admin/AiReportViewer";
import {
  Card,
  CardHeader,
  StatusBadge,
  Button,
  LoadingState,
  Spinner,
} from "@/components/ui";
import type { SubmissionStatus, ProductType } from "@/types/submission";

const productTypeLabels: Record<ProductType, string> = {
  distilled_spirits: "Distilled Spirits",
  wine: "Wine",
  malt_beverage: "Malt Beverage",
};

const sourceLabels: Record<string, string> = {
  domestic: "Domestic",
  imported: "Imported",
};

function formatDate(timestamp: unknown): string {
  if (!timestamp) return "\u2014";
  const ts = timestamp as { seconds?: number; toDate?: () => Date };
  if (ts.toDate) return ts.toDate().toLocaleDateString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
  return "\u2014";
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined | boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  const display =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="py-2">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{display}</dd>
    </div>
  );
}

export default function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { submission, images, validationResults, reviews, loading, error } =
    useSubmission(id);

  const latestValidation = validationResults[0] ?? null;

  const getToken = async () => {
    const token = await user?.getIdToken();
    return token || "";
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Loading submission..." />}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && submission && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {submission.brandName}
                </h1>
                <StatusBadge status={submission.status as SubmissionStatus} />
                {submission.needsAttention && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Needs Attention
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {productTypeLabels[submission.productType]} &middot;{" "}
                {sourceLabels[submission.source]} &middot; Version{" "}
                {submission.version} &middot; {formatDate(submission.createdAt)}
              </p>
              <p className="mt-0.5 font-mono text-xs text-gray-400">
                ID: {submission.id} &middot; User: {submission.userId}
              </p>
            </div>
            <Link href="/admin/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Validation In Progress Banner */}
          {submission.validationInProgress && (
            <div className="flex items-center gap-3 rounded-md bg-blue-50 p-4 text-sm text-blue-700">
              <Spinner className="h-4 w-4" />
              <span>AI validation is currently in progress...</span>
            </div>
          )}

          {/* Admin Review Actions */}
          <ReviewActionPanel
            submissionId={id}
            currentStatus={submission.status as SubmissionStatus}
            validationInProgress={submission.validationInProgress}
            onReviewSubmitted={() => {
              // Real-time listener will update the data
            }}
            getToken={getToken}
          />

          {/* AI Validation Report (admin-level detail) — hide stale results while validating */}
          {latestValidation && !submission.validationInProgress && (
            <AiReportViewer result={latestValidation} />
          )}

          {/* User-facing Validation Summary */}
          {latestValidation && !submission.validationInProgress && (
            <ValidationResultsPanel
              result={latestValidation}
              validationInProgress={submission.validationInProgress}
              showConfidence
            />
          )}

          {/* Label Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader title="Label Images" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="overflow-hidden rounded-md border border-gray-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.downloadUrl}
                      alt={img.originalFilename}
                      className="h-64 w-full object-contain bg-gray-50"
                    />
                    <div className="border-t border-gray-200 bg-white px-3 py-2">
                      <p className="truncate text-xs text-gray-600">
                        {img.originalFilename}
                      </p>
                      <p className="text-xs text-gray-400">
                        {img.imageType} &middot;{" "}
                        {(img.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Form Data */}
          <Card>
            <CardHeader title="Submission Details" />
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <FieldRow
                label="Product Type"
                value={productTypeLabels[submission.productType]}
              />
              <FieldRow
                label="Source"
                value={sourceLabels[submission.source]}
              />
              <FieldRow
                label="Serial Number"
                value={submission.serialNumber}
              />
              <FieldRow label="Brand Name" value={submission.brandName} />
              <FieldRow
                label="Fanciful Name"
                value={submission.fancifulName}
              />
              <FieldRow
                label="Class/Type Designation"
                value={submission.classTypeDesignation}
              />
              <FieldRow
                label="Alcohol Content"
                value={
                  submission.alcoholContent
                    ? `${submission.alcoholContent}%`
                    : null
                }
              />
              <FieldRow label="Net Contents" value={submission.netContents} />
              <FieldRow
                label="Name & Address on Label"
                value={submission.nameAddressOnLabel}
              />
              {submission.source === "imported" && (
                <FieldRow
                  label="Country of Origin"
                  value={submission.countryOfOrigin}
                />
              )}
              {submission.productType === "wine" && (
                <>
                  <FieldRow
                    label="Grape Varietals"
                    value={submission.grapeVarietals}
                  />
                  <FieldRow
                    label="Appellation of Origin"
                    value={submission.appellationOfOrigin}
                  />
                  <FieldRow
                    label="Vintage Year"
                    value={submission.vintageDate}
                  />
                </>
              )}
              <FieldRow
                label="Health Warning Confirmed"
                value={submission.healthWarningConfirmed}
              />
            </dl>
          </Card>

          {/* Review History */}
          {reviews.length > 0 && (
            <Card>
              <CardHeader title="Review History" />
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`rounded-md border p-3 ${
                      review.action === "approved"
                        ? "border-green-200 bg-green-50"
                        : review.action === "needs_revision"
                          ? "border-orange-200 bg-orange-50"
                          : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge
                        status={review.action as SubmissionStatus}
                      />
                      <span className="text-xs text-gray-500">
                        {formatDate(review.createdAt)} &middot; Admin:{" "}
                        {review.adminId.slice(0, 8)}...
                      </span>
                    </div>
                    {review.feedbackToUser && (
                      <p className="mt-2 text-sm text-gray-700">
                        <span className="font-medium">Feedback:</span>{" "}
                        {review.feedbackToUser}
                      </p>
                    )}
                    {review.internalNotes && (
                      <p className="mt-1 text-sm text-gray-500 italic">
                        <span className="font-medium">Internal:</span>{" "}
                        {review.internalNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!loading && !error && !submission && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Submission not found.</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push("/admin/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
