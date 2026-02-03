"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";

export default function SettingsPage() {
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="text-sm font-medium capitalize text-gray-900">
              {role || "user"}
            </p>
          </div>

          <hr className="border-gray-200" />

          <Link
            href="/profile"
            className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Profile
          </Link>

          <button
            onClick={signOut}
            className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>

        <p className="text-center text-sm text-gray-600">
          <Link
            href="/dashboard"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
