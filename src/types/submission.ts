import { Timestamp } from "firebase/firestore";

export type ProductType = "wine" | "distilled_spirits" | "malt_beverage";
export type ProductSource = "domestic" | "imported";
export type SubmissionStatus =
  | "pending"
  | "approved"
  | "needs_revision"
  | "rejected";

export interface Submission {
  userId: string;
  productType: ProductType;
  source: ProductSource;
  serialNumber: string;
  brandName: string;
  fancifulName: string | null;
  classTypeDesignation: string;
  alcoholContent: string;
  netContents: string;
  nameAddressOnLabel: string;
  countryOfOrigin: string | null;
  // Wine-specific fields
  grapeVarietals: string | null;
  appellationOfOrigin: string | null;
  vintageDate: string | null;
  healthWarningConfirmed: boolean;
  status: SubmissionStatus;
  needsAttention: boolean;
  validationInProgress: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ImageType = "brand_front" | "back" | "other";

export interface SubmissionImage {
  imageType: ImageType;
  storagePath: string;
  downloadUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: Timestamp;
}

export type ReviewAction = "approved" | "needs_revision" | "rejected";

export interface Review {
  adminId: string;
  action: ReviewAction;
  feedbackToUser: string | null;
  internalNotes: string | null;
  createdAt: Timestamp;
}

export interface HistoryEntry {
  version: number;
  changes: Record<string, unknown>;
  changedBy: string;
  createdAt: Timestamp;
}
