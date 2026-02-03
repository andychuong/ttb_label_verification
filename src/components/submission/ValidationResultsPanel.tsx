import { Card, CardHeader } from "@/components/ui";
import { FieldCheckRow } from "./FieldCheckRow";
import type { ValidationResultDoc } from "@/lib/hooks/useSubmission";
import type { Confidence } from "@/types/validation";

const checkLabels: Record<string, string> = {
  image_present: "Image Present",
  health_warning: "Health Warning",
  brand_name: "Brand Name",
  alcohol_content: "Alcohol Content",
  net_contents: "Net Contents",
  country_of_origin: "Country of Origin",
  name_address: "Name & Address",
  grape_varietals: "Grape Varietals",
  appellation: "Appellation of Origin",
  vintage_date: "Vintage Year",
  fanciful_name: "Fanciful Name",
};

function formatCheckName(check: string): string {
  if (checkLabels[check]) return checkLabels[check];
  return check
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const confidenceConfig: Record<
  Confidence,
  { label: string; classes: string }
> = {
  high: { label: "High Confidence", classes: "text-gray-600 bg-gray-100" },
  medium: {
    label: "Medium Confidence",
    classes: "text-yellow-700 bg-yellow-50",
  },
  low: { label: "Low Confidence", classes: "text-red-700 bg-red-50" },
};

interface ValidationResultsPanelProps {
  result: ValidationResultDoc;
  validationInProgress: boolean;
  showConfidence?: boolean;
}

export function ValidationResultsPanel({
  result,
  validationInProgress,
  showConfidence = false,
}: ValidationResultsPanelProps) {
  const confidence = confidenceConfig[result.confidence];

  // Separate health warning from other field checks
  const healthWarning = result.fieldResults.find(
    (fr) => fr.fieldName === "healthWarning"
  );
  const fieldChecks = result.fieldResults.filter(
    (fr) =>
      fr.matchStatus !== "NOT_APPLICABLE" && fr.fieldName !== "healthWarning"
  );

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
            {showConfidence && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidence.classes}`}
              >
                {confidence.label}
              </span>
            )}
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

      {/* Field Results — hide NOT_APPLICABLE fields and health warning (shown separately) */}
      {fieldChecks.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Field Checks
          </h4>
          <div className="rounded-md border border-gray-200">
            <div className="divide-y divide-gray-100 px-4">
              {fieldChecks.map((fr, i) => (
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
                <span className="font-medium">{formatCheckName(w.check)}:</span> {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Warning — shown at the bottom with simplified layout */}
      {healthWarning && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Government Health Warning
          </h4>
          <div className="rounded-md border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {healthWarning.labelValue ? (
                  <p className="text-xs text-gray-600">
                    {healthWarning.labelValue}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Not detected on label
                  </p>
                )}
                {healthWarning.notes && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    {healthWarning.notes}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  healthWarning.matchStatus === "MATCH"
                    ? "bg-green-100 text-green-700"
                    : healthWarning.matchStatus === "NOT_FOUND"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {healthWarning.matchStatus === "MATCH" ? "\u2713 Present" : healthWarning.matchStatus === "NOT_FOUND" ? "? Not Found" : "\u2717 Missing"}
              </span>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}
