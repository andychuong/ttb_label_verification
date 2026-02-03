import type { MatchStatus } from "@/types/validation";

const fieldLabels: Record<string, string> = {
  brandName: "Brand Name",
  classTypeDesignation: "Class/Type Designation",
  alcoholContent: "Alcohol Content",
  netContents: "Net Contents",
  healthWarning: "Health Warning",
  nameAddressOnLabel: "Name & Address on Label",
  fancifulName: "Fanciful Name",
  countryOfOrigin: "Country of Origin",
  grapeVarietals: "Grape Varietals",
  appellationOfOrigin: "Appellation of Origin",
  vintageDate: "Vintage Year",
};

function formatFieldName(fieldName: string): string {
  if (fieldLabels[fieldName]) return fieldLabels[fieldName];
  // Fallback: convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const statusConfig: Record<
  MatchStatus,
  { label: string; icon: string; classes: string }
> = {
  MATCH: {
    label: "Match",
    icon: "\u2713",
    classes: "bg-green-100 text-green-700",
  },
  MISMATCH: {
    label: "Mismatch",
    icon: "\u2717",
    classes: "bg-red-100 text-red-700",
  },
  NOT_FOUND: {
    label: "Not Found",
    icon: "?",
    classes: "bg-yellow-100 text-yellow-700",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    icon: "\u2014",
    classes: "bg-gray-100 text-gray-500",
  },
};

interface FieldCheckRowProps {
  fieldName: string;
  formValue: string;
  labelValue: string;
  matchStatus: MatchStatus;
  notes: string;
}

export function FieldCheckRow({
  fieldName,
  formValue,
  labelValue,
  matchStatus,
  notes,
}: FieldCheckRowProps) {
  const config = statusConfig[matchStatus];

  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{formatFieldName(fieldName)}</p>
          <div className="mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            <div>
              <span className="text-gray-500">Form: </span>
              <span className="text-gray-700">
                {formValue || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Label: </span>
              <span className="text-gray-700">
                {labelValue || "\u2014"}
              </span>
            </div>
          </div>
          {notes && (
            <p className="mt-1 text-xs text-gray-500">{notes}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}
        >
          <span>{config.icon}</span>
          {config.label}
        </span>
      </div>
    </div>
  );
}
