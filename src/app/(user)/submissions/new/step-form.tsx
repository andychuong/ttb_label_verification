"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submissionSchema,
  type SubmissionFormData,
} from "@/lib/validation/formSchemas";
import { Input, Select, Checkbox, Button } from "@/components/ui";

const productTypeOptions = [
  { value: "distilled_spirits", label: "Distilled Spirits" },
  { value: "wine", label: "Wine" },
  { value: "malt_beverage", label: "Malt Beverage" },
];

const sourceOptions = [
  { value: "domestic", label: "Domestic" },
  { value: "imported", label: "Imported" },
];

interface StepFormProps {
  defaultValues?: SubmissionFormData;
  onNext: (data: SubmissionFormData) => void;
  submitLabel?: string;
}

export default function StepForm({ defaultValues, onNext, submitLabel }: StepFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema) as Resolver<SubmissionFormData>,
    defaultValues: defaultValues ?? {
      productType: undefined as unknown as SubmissionFormData["productType"],
      source: undefined as unknown as SubmissionFormData["source"],
      serialNumber: "",
      brandName: "",
      fancifulName: "",
      classTypeDesignation: "",
      alcoholContent: "",
      netContents: "",
      nameAddressOnLabel: "",
      countryOfOrigin: "",
      grapeVarietals: "",
      appellationOfOrigin: "",
      vintageDate: "",
      healthWarningConfirmed: false,
    },
  });

  const source = watch("source");
  const productType = watch("productType");
  const isImported = source === "imported";
  const isWine = productType === "wine";
  const isMaltBeverage = productType === "malt_beverage";

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
            id="serialNumber"
            label="Serial Number *"
            {...register("serialNumber")}
            error={errors.serialNumber?.message}
            placeholder='e.g. "25-001"'
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
            error={errors.fancifulName?.message}
            placeholder="Additional product name (if any)"
          />
          <Input
            id="classTypeDesignation"
            label="Class/Type Designation *"
            {...register("classTypeDesignation")}
            error={errors.classTypeDesignation?.message}
            placeholder='e.g. "Vodka", "Cabernet Sauvignon", "IPA"'
          />
          <Input
            id="alcoholContent"
            label={`Alcohol Content (%)${isMaltBeverage ? "" : " *"}`}
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
              placeholder="Bottler/producer name and address as shown on label"
            />
          </div>
          {isImported && (
            <Input
              id="countryOfOrigin"
              label="Country of Origin *"
              {...register("countryOfOrigin")}
              error={errors.countryOfOrigin?.message}
              placeholder='e.g. "France", "Scotland"'
            />
          )}
        </div>
      </fieldset>

      {/* --- Wine Details (conditional) --- */}
      {isWine && (
        <fieldset>
          <legend className="text-lg font-medium text-gray-900">
            Wine Details
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              id="grapeVarietals"
              label="Grape Varietals"
              {...register("grapeVarietals")}
              error={errors.grapeVarietals?.message}
              placeholder='e.g. "Cabernet Sauvignon"'
            />
            <Input
              id="appellationOfOrigin"
              label="Appellation of Origin"
              {...register("appellationOfOrigin")}
              error={errors.appellationOfOrigin?.message}
              placeholder='e.g. "Napa Valley"'
            />
            <Input
              id="vintageDate"
              label="Vintage Year"
              {...register("vintageDate")}
              error={errors.vintageDate?.message}
              placeholder="e.g. 2021"
            />
          </div>
        </fieldset>
      )}

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
        <Button type="submit">{submitLabel ?? "Next: Upload Label Image"}</Button>
      </div>
    </form>
  );
}
