import { Card, CardHeader } from "@/components/ui";
import { FieldCheckRow } from "@/components/submission/FieldCheckRow";
import type { ValidationResultDoc } from "@/lib/hooks/useSubmission";
import type { Confidence } from "@/types/validation";

const confidenceConfig: Record<
  Confidence,
  { label: string; classes: string }
> = {
  high: { label: "High", classes: "text-green-700 bg-green-50" },
  medium: { label: "Medium", classes: "text-yellow-700 bg-yellow-50" },
  low: { label: "Low", classes: "text-red-700 bg-red-50" },
};

interface AiReportViewerProps {
  result: ValidationResultDoc;
}

export function AiReportViewer({ result }: AiReportViewerProps) {
  const confidence = confidenceConfig[result.confidence];

  return (
    <Card>
      <CardHeader
        title="AI Validation Report"
        description="Detailed GPT-4o analysis results"
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidence.classes}`}
            >
              Confidence: {confidence.label}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                result.overallPass
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {result.overallPass ? "Overall Pass" : "Overall Fail"}
            </span>
          </div>
        }
      />

      {/* Per-field results */}
      <div className="mb-6">
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          Field-by-Field Analysis ({result.fieldResults.length} fields)
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

      {/* Compliance Warnings */}
      {result.complianceWarnings.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Compliance Warnings ({result.complianceWarnings.length})
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
        <div className="mb-6">
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Extracted Label Text
          </h4>
          <pre className="max-h-60 overflow-y-auto rounded-md bg-gray-50 p-4 text-xs text-gray-600 whitespace-pre-wrap">
            {result.extractedText}
          </pre>
        </div>
      )}

      {/* Raw AI Response (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
          Raw AI Response (debug)
        </summary>
        <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-green-400">
          {JSON.stringify(result.rawAiResponse, null, 2)}
        </pre>
      </details>
    </Card>
  );
}
