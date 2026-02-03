import { Card, CardHeader } from "@/components/ui";
import { FieldCheckRow } from "./FieldCheckRow";
import type { ValidationResultDoc } from "@/lib/hooks/useSubmission";
import type { Confidence } from "@/types/validation";

const confidenceConfig: Record<
  Confidence,
  { label: string; classes: string }
> = {
  high: { label: "High Confidence", classes: "text-green-700 bg-green-50" },
  medium: {
    label: "Medium Confidence",
    classes: "text-yellow-700 bg-yellow-50",
  },
  low: { label: "Low Confidence", classes: "text-red-700 bg-red-50" },
};

interface ValidationResultsPanelProps {
  result: ValidationResultDoc;
  validationInProgress: boolean;
}

export function ValidationResultsPanel({
  result,
  validationInProgress,
}: ValidationResultsPanelProps) {
  const confidence = confidenceConfig[result.confidence];

  return (
    <Card>
      <CardHeader
        title="Validation Results"
        description={
          validationInProgress
            ? "Validation is currently in progress..."
            : result.overallPass
              ? "All critical checks passed"
              : "One or more checks need attention"
        }
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidence.classes}`}
            >
              {confidence.label}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                result.overallPass
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {result.overallPass ? "Pass" : "Fail"}
            </span>
          </div>
        }
      />

      {/* Field Results */}
      {result.fieldResults.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Field Checks
          </h4>
          <div className="rounded-md border border-gray-200">
            <div className="divide-y divide-gray-100 px-4">
              {result.fieldResults.map((fr, i) => (
                <FieldCheckRow
                  key={`${fr.fieldName}-${i}`}
                  fieldName={fr.fieldName}
                  formValue={fr.formValue}
                  labelValue={fr.labelValue}
                  matchStatus={fr.matchStatus}
                  notes={fr.notes}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Warnings */}
      {result.complianceWarnings.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Compliance Warnings
          </h4>
          <div className="space-y-2">
            {result.complianceWarnings.map((w, i) => (
              <div
                key={`${w.check}-${i}`}
                className={`rounded-md p-3 text-sm ${
                  w.severity === "error"
                    ? "bg-red-50 text-red-700"
                    : w.severity === "warning"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                }`}
              >
                <span className="font-medium">{w.check}:</span> {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Text */}
      {result.extractedText && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Extracted Label Text
          </h4>
          <div className="max-h-40 overflow-y-auto rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            {result.extractedText}
          </div>
        </div>
      )}
    </Card>
  );
}
