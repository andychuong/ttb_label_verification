"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth/context";
import {
  userProfileSchema,
  type UserProfileFormData,
} from "@/lib/validation/formSchemas";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      companyName: "",
      companyAddress: "",
      mailingAddress: "",
      permitRegistryNumber: "",
      representativeId: "",
    },
  });

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchProfile() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data) {
          reset({
            fullName: json.data.fullName || "",
            email: json.data.email || user!.email || "",
            phoneNumber: json.data.phoneNumber || "",
            companyName: json.data.companyName || "",
            companyAddress: json.data.companyAddress || "",
            mailingAddress: json.data.mailingAddress || "",
            permitRegistryNumber: json.data.permitRegistryNumber || "",
            representativeId: json.data.representativeId || "",
          });
        } else {
          // No profile yet — pre-fill email
          reset({ email: user!.email || "" });
        }
      } catch {
        setFetchError("Failed to load profile.");
      }
    }

    fetchProfile();
  }, [user, authLoading, reset]);

  const onSubmit = async (data: UserProfileFormData) => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg("");
    setFetchError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Profile saved successfully.");
        // Navigate to dashboard after first profile setup
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setFetchError(json.error?.message || "Failed to save profile.");
      }
    } catch {
      setFetchError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in your details to start submitting labels for verification.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-lg bg-white p-8 shadow"
        >
          {fetchError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {fetchError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                {...register("fullName")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                readOnly
                className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                {...register("phoneNumber")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700"
              >
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                {...register("companyName")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            {/* Company Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="companyAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Company Address <span className="text-red-500">*</span>
              </label>
              <input
                id="companyAddress"
                type="text"
                {...register("companyAddress")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.companyAddress && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.companyAddress.message}
                </p>
              )}
            </div>

            {/* Mailing Address (optional) */}
            <div className="sm:col-span-2">
              <label
                htmlFor="mailingAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Mailing Address{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="mailingAddress"
                type="text"
                {...register("mailingAddress")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Permit/Registry Number */}
            <div>
              <label
                htmlFor="permitRegistryNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Permit/Registry Number{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="permitRegistryNumber"
                type="text"
                {...register("permitRegistryNumber")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.permitRegistryNumber && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.permitRegistryNumber.message}
                </p>
              )}
            </div>

            {/* Representative ID (optional) */}
            <div>
              <label
                htmlFor="representativeId"
                className="block text-sm font-medium text-gray-700"
              >
                Representative ID{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="representativeId"
                type="text"
                {...register("representativeId")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
