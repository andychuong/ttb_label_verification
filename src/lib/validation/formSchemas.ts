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

// --- Submission Schema (TTB COLAs Online fields) ---

export const submissionSchema = z
  .object({
    productType: z.enum(["wine", "distilled_spirits", "malt_beverage"], {
      message: "Product type is required",
    }),
    source: z.enum(["domestic", "imported"], {
      message: "Source is required",
    }),
    serialNumber: z.string().min(1, "Serial number is required"),
    brandName: z.string().min(1, "Brand name is required"),
    fancifulName: z.string().nullable().optional(),
    classTypeDesignation: z
      .string()
      .min(1, "Class/Type designation is required"),
    alcoholContent: z.string().refine(
      (val) => {
        if (!val || val.trim() === "") return true; // allow empty (conditionally required in superRefine)
        const num = parseFloat(val.replace(/[^0-9.]/g, ""));
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      "Alcohol content must be a number between 0 and 100"
    ),
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
    countryOfOrigin: z.string().nullable().optional(),
    // Wine-specific fields
    grapeVarietals: z.string().nullable().optional(),
    appellationOfOrigin: z.string().nullable().optional(),
    vintageDate: z.string().nullable().optional(),
    healthWarningConfirmed: z.boolean().refine((val) => val === true, {
      message: "Health warning must be confirmed",
    }),
  })
  .superRefine((data, ctx) => {
    // Country of origin required for imported products
    if (data.source === "imported" && !data.countryOfOrigin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Country of origin is required for imported products",
        path: ["countryOfOrigin"],
      });
    }
    // Alcohol content required for wine and distilled spirits (optional for malt beverage per 27 CFR Part 7)
    if (
      data.productType !== "malt_beverage" &&
      (!data.alcoholContent || data.alcoholContent.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Alcohol content is required for wine and distilled spirits",
        path: ["alcoholContent"],
      });
    }
    // Validate vintage date format if provided
    if (data.vintageDate && data.vintageDate.trim() !== "") {
      const year = parseInt(data.vintageDate, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1700 || year > currentYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Vintage year must be between 1700 and ${currentYear}`,
          path: ["vintageDate"],
        });
      }
    }
  });

export type SubmissionFormData = z.infer<typeof submissionSchema>;
