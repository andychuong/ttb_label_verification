import { Timestamp } from "firebase/firestore";

export type ProductType = "wine" | "distilled_spirits" | "malt_beverage";
export type ProductSource = "domestic" | "imported";
export type SubmissionStatus =
  | "pending"
  | "approved"
  | "needs_revision"
  | "rejected";
export type ApplicationType =
  | "cola"
  | "exemption"
  | "distinctive_bottle"
  | "resubmission";

export interface Submission {
  userId: string;
  serialNumber: string;
  productType: ProductType;
  source: ProductSource;
  brandName: string;
  fancifulName: string | null;
  classTypeDesignation: string;
  statementOfComposition: string | null;
  alcoholContent: string;
  netContents: string;
  nameAddressOnLabel: string;
  applicationType: ApplicationType[];
  resubmissionTtbId: string | null;
  formulaNumber: string | null;
  containerInfo: string | null;

  // Wine only
  grapeVarietals: string | null;
  appellationOfOrigin: string | null;
  vintageDate: string | null;

  // Imported only
  countryOfOrigin: string | null;

  // Spirits only
  ageStatement: string | null;
  stateOfDistillation: string | null;
  commodityStatement: string | null;
  coloringMaterials: string | null;

  // Declarations
  fdncYellow5: boolean;
  cochinealCarmine: boolean;
  sulfiteDeclaration: boolean;
  healthWarningConfirmed: boolean;

  // Wine only
  foreignWinePercentage: string | null;

  applicantNotes: string | null;
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
