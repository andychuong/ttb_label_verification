"use client";

import { RequireProfile } from "@/lib/auth/guards";

export default function DashboardPage() {
  return (
    <RequireProfile>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your submissions will appear here.
        </p>
      </div>
    </RequireProfile>
  );
}
