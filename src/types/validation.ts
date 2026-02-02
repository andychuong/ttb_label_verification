import { Timestamp } from "firebase/firestore";

export type MatchStatus = "MATCH" | "MISMATCH" | "NOT_FOUND" | "NOT_APPLICABLE";
export type Confidence = "high" | "medium" | "low";

export interface FieldResult {
  fieldName: string;
  formValue: string;
  labelValue: string;
  matchStatus: MatchStatus;
  notes: string;
}

export interface ComplianceWarning {
  check: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface ValidationResult {
  extractedText: string;
  fieldResults: FieldResult[];
  complianceWarnings: ComplianceWarning[];
  overallPass: boolean;
  confidence: Confidence;
  rawAiResponse: Record<string, unknown>;
  processedAt: Timestamp;
  createdAt: Timestamp;
}
