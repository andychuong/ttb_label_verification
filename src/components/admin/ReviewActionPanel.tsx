"use client";

import { useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import type { SubmissionStatus } from "@/types/submission";

interface ReviewActionPanelProps {
  submissionId: string;
  currentStatus: SubmissionStatus;
  validationInProgress: boolean;
  onReviewSubmitted: () => void;
  getToken: () => Promise<string>;
}

type ReviewAction = "approved" | "needs_revision" | "rejected";

const actionConfig: Record<
  ReviewAction,
  { label: string; title: string; btnClass: string; requiresFeedback: boolean }
> = {
  approved: {
    label: "Approve",
    title: "Approve Submission",
    btnClass: "bg-green-600 hover:bg-green-700 text-white",
    requiresFeedback: false,
  },
  needs_revision: {
    label: "Request Revision",
    title: "Request Revision",
    btnClass: "bg-orange-600 hover:bg-orange-700 text-white",
    requiresFeedback: true,
  },
  rejected: {
    label: "Reject",
    title: "Reject Submission",
    btnClass: "bg-red-600 hover:bg-red-700 text-white",
    requiresFeedback: true,
  },
};

export function ReviewActionPanel({
  submissionId,
  currentStatus,
  validationInProgress,
  onReviewSubmitted,
  getToken,
}: ReviewActionPanelProps) {
  const [modalAction, setModalAction] = useState<ReviewAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitReview = async () => {
    if (!modalAction) return;

    const config = actionConfig[modalAction];
    if (config.requiresFeedback && !feedback.trim()) {
      setError(
        modalAction === "rejected"
          ? "Rejection reason is required"
          : "Feedback to user is required"
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: modalAction,
            feedbackToUser: feedback.trim() || null,
            internalNotes: internalNotes.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to submit review");
      }

      setModalAction(null);
      setFeedback("");
      setInternalNotes("");
      onReviewSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalAction(null);
    setFeedback("");
    setInternalNotes("");
    setError(null);
  };

  const disabled = validationInProgress || currentStatus === "approved";

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">
          Admin Actions
        </h3>

        {validationInProgress && (
          <p className="mb-3 text-xs text-yellow-600">
            Validation in progress — review actions disabled.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(actionConfig) as ReviewAction[]).map((action) => {
            const config = actionConfig[action];
            return (
              <button
                key={action}
                disabled={disabled}
                onClick={() => setModalAction(action)}
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${config.btnClass}`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <Modal
          open={!!modalAction}
          onClose={closeModal}
          title={actionConfig[modalAction].title}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${actionConfig[modalAction].btnClass}`}
              >
                {submitting ? "Submitting..." : "Confirm"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {actionConfig[modalAction].requiresFeedback && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {modalAction === "rejected"
                    ? "Rejection Reason *"
                    : "Feedback to User *"}
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    modalAction === "rejected"
                      ? "Explain why this submission was rejected..."
                      : "Describe what needs to be revised..."
                  }
                  rows={3}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Internal Notes (optional)
              </label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Admin-only notes..."
                rows={2}
              />
            </div>

            <p className="text-xs text-gray-500">
              {modalAction === "approved" &&
                "This will approve the submission and notify the user."}
              {modalAction === "needs_revision" &&
                "The user will be notified and can revise and resubmit."}
              {modalAction === "rejected" &&
                "This will permanently reject the submission. The user can create a new submission."}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
