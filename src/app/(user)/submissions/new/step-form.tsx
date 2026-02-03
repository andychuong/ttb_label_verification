"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submissionSchema,
  type SubmissionFormData,
} from "@/lib/validation/formSchemas";
import { Input, Select, Checkbox, Textarea, Button } from "@/components/ui";

const productTypeOptions = [
  { value: "distilled_spirits", label: "Distilled Spirits" },
  { value: "wine", label: "Wine" },
  { value: "malt_beverage", label: "Malt Beverage" },
];

const sourceOptions = [
  { value: "domestic", label: "Domestic" },
  { value: "imported", label: "Imported" },
];

const applicationTypes = [
  { value: "cola", label: "Certificate of Label Approval (COLA)" },
  { value: "exemption", label: "Certificate of Exemption" },
  { value: "distinctive_bottle", label: "Distinctive Liquor Bottle Approval" },
  { value: "resubmission", label: "Resubmission After Rejection" },
] as const;

interface StepFormProps {
  defaultValues?: SubmissionFormData;
  onNext: (data: SubmissionFormData) => void;
}

export default function StepForm({ defaultValues, onNext }: StepFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema) as Resolver<SubmissionFormData>,
    defaultValues: defaultValues ?? {
      serialNumber: "",
      productType: undefined as unknown as SubmissionFormData["productType"],
      source: undefined as unknown as SubmissionFormData["source"],
      brandName: "",
      fancifulName: "",
      alcoholContent: "",
      netContents: "",
      nameAddressOnLabel: "",
      applicationType: [],
      resubmissionTtbId: "",
      formulaNumber: "",
      containerInfo: "",
      healthWarningConfirmed: false,
      applicantNotes: "",
      classTypeDesignation: "",
      statementOfComposition: "",
      ageStatement: "",
      countryOfOrigin: "",
      stateOfDistillation: "",
      commodityStatement: "",
      coloringMaterials: "",
      fdncYellow5: false,
      cochinealCarmine: false,
      sulfiteDeclaration: false,
      grapeVarietals: "",
      appellationOfOrigin: "",
      vintageDate: "",
      foreignWinePercentage: "",
    },
  });

  const productType = watch("productType");
  const source = watch("source");
  const applicationType = watch("applicationType");
  const isImported = source === "imported";
  const isSpirits = productType === "distilled_spirits";
  const isWine = productType === "wine";
  const isMalt = productType === "malt_beverage";
  const isResubmission = applicationType?.includes("resubmission");

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      className="space-y-8 rounded-lg bg-white p-8 shadow"
    >
      {/* --- Product Info --- */}
      <fieldset>
        <legend className="text-lg font-medium text-gray-900">
          Product Information
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input
            id="serialNumber"
            label="Serial Number *"
            {...register("serialNumber")}
            error={errors.serialNumber?.message}
          />
          <Select
            id="productType"
            label="Product Type *"
            options={productTypeOptions}
            placeholder="Select product type"
            {...register("productType")}
            error={errors.productType?.message}
          />
          <Select
            id="source"
            label="Source *"
            options={sourceOptions}
            placeholder="Select source"
            {...register("source")}
            error={errors.source?.message}
          />
          <Input
            id="brandName"
            label="Brand Name *"
            {...register("brandName")}
            error={errors.brandName?.message}
          />
          <Input
            id="fancifulName"
            label="Fanciful Name"
            {...register("fancifulName")}
          />
          <Input
            id="alcoholContent"
            label="Alcohol Content (%) *"
            {...register("alcoholContent")}
            error={errors.alcoholContent?.message}
            placeholder="e.g. 40"
          />
          <Input
            id="netContents"
            label="Net Contents *"
            {...register("netContents")}
            error={errors.netContents?.message}
            placeholder="e.g. 750 mL"
          />
          <div className="sm:col-span-2">
            <Input
              id="nameAddressOnLabel"
              label="Name & Address on Label *"
              {...register("nameAddressOnLabel")}
              error={errors.nameAddressOnLabel?.message}
            />
          </div>
        </div>
      </fieldset>

      {/* --- Class/Type (shown for all product types once selected) --- */}
      {productType && (
        <fieldset>
          <legend className="text-lg font-medium text-gray-900">
            Classification
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              id="classTypeDesignation"
              label="Class/Type Designation *"
              {...register("classTypeDesignation")}
              error={errors.classTypeDesignation?.message}
            />
            {isImported && (
              <Input
                id="countryOfOrigin"
                label="Country of Origin *"
                {...register("countryOfOrigin")}
                error={errors.countryOfOrigin?.message}
              />
            )}
          </div>
        </fieldset>
      )}

      {/* --- Distilled Spirits Fields --- */}
      {isSpirits && (
        <fieldset>
          <legend className="text-lg font-medium text-gray-900">
            Distilled Spirits Details
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Textarea
              id="statementOfComposition"
              label="Statement of Composition"
              {...register("statementOfComposition")}
            />
            <Input
              id="ageStatement"
              label="Age Statement"
              {...register("ageStatement")}
            />
            <Input
              id="stateOfDistillation"
              label="State of Distillation"
              {...register("stateOfDistillation")}
            />
            <Input
              id="commodityStatement"
              label="Commodity Statement"
              {...register("commodityStatement")}
            />
            <Input
              id="coloringMaterials"
              label="Coloring Materials"
              {...register("coloringMaterials")}
            />
          </div>
          <div className="mt-4 space-y-3">
            <Checkbox
              id="fdncYellow5"
              label="Contains FD&C Yellow #5"
              {...register("fdncYellow5")}
            />
            <Checkbox
              id="cochinealCarmine"
              label="Contains Cochineal/Carmine"
              {...register("cochinealCarmine")}
            />
            <Checkbox
              id="sulfiteDeclaration"
              label="Contains Sulfites"
              {...register("sulfiteDeclaration")}
            />
          </div>
        </fieldset>
      )}

      {/* --- Wine Fields --- */}
      {isWine && (
        <fieldset>
          <legend className="text-lg font-medium text-gray-900">
            Wine Details
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              id="grapeVarietals"
              label="Grape Varietal(s)"
              {...register("grapeVarietals")}
            />
            <Input
              id="appellationOfOrigin"
              label="Appellation of Origin"
              {...register("appellationOfOrigin")}
            />
            <Input
              id="vintageDate"
              label="Vintage Date"
              {...register("vintageDate")}
            />
            <Input
              id="foreignWinePercentage"
              label="Foreign Wine Percentage"
              {...register("foreignWinePercentage")}
            />
          </div>
          <div className="mt-4 space-y-3">
            <Checkbox
              id="sulfiteDeclaration"
              label="Contains Sulfites"
              {...register("sulfiteDeclaration")}
            />
            <Checkbox
              id="fdncYellow5"
              label="Contains FD&C Yellow #5"
              {...register("fdncYellow5")}
            />
            <Checkbox
              id="cochinealCarmine"
              label="Contains Cochineal/Carmine"
              {...register("cochinealCarmine")}
            />
          </div>
        </fieldset>
      )}

      {/* --- Malt Beverage has no extra fields beyond class/type + country --- */}

      {/* --- Application Details --- */}
      <fieldset>
        <legend className="text-lg font-medium text-gray-900">
          Application Details
        </legend>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Application Type *
            </p>
            <div className="space-y-2">
              <Controller
                control={control}
                name="applicationType"
                render={({ field }) => (
                  <>
                    {applicationTypes.map((at) => (
                      <label key={at.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={at.value}
                          checked={field.value?.includes(at.value) ?? false}
                          onChange={(e) => {
                            const current = field.value ?? [];
                            if (e.target.checked) {
                              field.onChange([...current, at.value]);
                            } else {
                              field.onChange(
                                current.filter((v) => v !== at.value)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {at.label}
                        </span>
                      </label>
                    ))}
                  </>
                )}
              />
            </div>
            {errors.applicationType && (
              <p className="mt-1 text-xs text-red-600">
                {errors.applicationType.message}
              </p>
            )}
          </div>

          {isResubmission && (
            <Input
              id="resubmissionTtbId"
              label="Previous TTB ID *"
              {...register("resubmissionTtbId")}
              error={errors.resubmissionTtbId?.message}
            />
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              id="formulaNumber"
              label="Formula Number"
              {...register("formulaNumber")}
            />
            <Input
              id="containerInfo"
              label="Container Information"
              {...register("containerInfo")}
            />
          </div>

          <Textarea
            id="applicantNotes"
            label="Applicant Notes"
            {...register("applicantNotes")}
            helperText="Optional notes for the reviewer"
          />
        </div>
      </fieldset>

      {/* --- Health Warning --- */}
      <fieldset>
        <legend className="text-lg font-medium text-gray-900">
          Confirmation
        </legend>
        <div className="mt-4">
          <Checkbox
            id="healthWarningConfirmed"
            label="I confirm the label includes the required Government Health Warning statement"
            {...register("healthWarningConfirmed")}
            error={errors.healthWarningConfirmed?.message}
          />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit">Next: Upload Label Image</Button>
      </div>
    </form>
  );
}
