import { z } from "zod";

// --- User Profile ---

export const userProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  mailingAddress: z.string().nullable().optional(),
  permitRegistryNumber: z.string().min(1, "Permit/Registry number is required"),
  representativeId: z.string().nullable().optional(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

// --- Image Upload ---

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_SIZE, "File must be under 10 MB")
    .refine(
      (f) => ACCEPTED_IMAGE_TYPES.includes(f.type),
      "File must be JPEG, PNG, WebP, or TIFF"
    ),
});

// --- Common Submission Fields ---

const applicationTypeEnum = z.enum([
  "cola",
  "exemption",
  "distinctive_bottle",
  "resubmission",
]);

const commonFieldsSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  productType: z.enum(["wine", "distilled_spirits", "malt_beverage"], {
    message: "Product type is required",
  }),
  source: z.enum(["domestic", "imported"], {
    message: "Source is required",
  }),
  brandName: z.string().min(1, "Brand name is required"),
  fancifulName: z.string().nullable().optional(),
  alcoholContent: z
    .string()
    .min(1, "Alcohol content is required")
    .refine((val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ""));
      return !isNaN(num) && num >= 0 && num <= 100;
    }, "Alcohol content must be a number between 0 and 100"),
  netContents: z
    .string()
    .min(1, "Net contents is required")
    .refine(
      (val) => /\d/.test(val),
      "Net contents must include a numeric value"
    ),
  nameAddressOnLabel: z
    .string()
    .min(1, "Name and address on label is required"),
  applicationType: z
    .array(applicationTypeEnum)
    .min(1, "At least one application type is required"),
  resubmissionTtbId: z.string().nullable().optional(),
  formulaNumber: z.string().nullable().optional(),
  containerInfo: z.string().nullable().optional(),
  healthWarningConfirmed: z.boolean().refine((val) => val === true, {
    message: "Health warning must be confirmed",
  }),
  applicantNotes: z.string().nullable().optional(),
});

// --- Distilled Spirits Fields ---

const distilledSpiritsFieldsSchema = z.object({
  classTypeDesignation: z.string().min(1, "Class/Type designation is required"),
  statementOfComposition: z.string().nullable().optional(),
  ageStatement: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  stateOfDistillation: z.string().nullable().optional(),
  commodityStatement: z.string().nullable().optional(),
  coloringMaterials: z.string().nullable().optional(),
  fdncYellow5: z.boolean().default(false),
  cochinealCarmine: z.boolean().default(false),
  sulfiteDeclaration: z.boolean().default(false),
});

// --- Wine Fields ---

const wineFieldsSchema = z.object({
  classTypeDesignation: z.string().min(1, "Class/Type designation is required"),
  grapeVarietals: z.string().nullable().optional(),
  appellationOfOrigin: z.string().nullable().optional(),
  vintageDate: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  sulfiteDeclaration: z.boolean().default(true),
  fdncYellow5: z.boolean().default(false),
  cochinealCarmine: z.boolean().default(false),
  foreignWinePercentage: z.string().nullable().optional(),
});

// --- Malt Beverage Fields ---

const maltBeverageFieldsSchema = z.object({
  classTypeDesignation: z.string().min(1, "Class/Type designation is required"),
  countryOfOrigin: z.string().nullable().optional(),
});

// --- Full Submission Schema (with superRefine for conditional validation) ---

export const submissionSchema = commonFieldsSchema
  .merge(distilledSpiritsFieldsSchema)
  .merge(wineFieldsSchema)
  .merge(maltBeverageFieldsSchema)
  .superRefine((data, ctx) => {
    // Require resubmission TTB ID when resubmission is selected
    if (
      data.applicationType.includes("resubmission") &&
      !data.resubmissionTtbId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Previous TTB ID is required for resubmissions",
        path: ["resubmissionTtbId"],
      });
    }

    // Require country of origin for imported products
    if (data.source === "imported" && !data.countryOfOrigin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Country of origin is required for imported products",
        path: ["countryOfOrigin"],
      });
    }
  });

export type SubmissionFormData = z.infer<typeof submissionSchema>;
