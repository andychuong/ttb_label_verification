"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequireProfile } from "@/lib/auth/guards";
import {
  useSubmissions,
  type SubmissionListItem,
} from "@/lib/hooks/useSubmissions";
import { Card, StatusBadge, Button, LoadingState } from "@/components/ui";
import type { SubmissionStatus, ProductType } from "@/types/submission";

const productTypeLabels: Record<ProductType, string> = {
  distilled_spirits: "Distilled Spirits",
  wine: "Wine",
  malt_beverage: "Malt Beverage",
};

const statusFilterOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "rejected", label: "Rejected" },
];

const productFilterOptions = [
  { value: "all", label: "All Types" },
  { value: "distilled_spirits", label: "Distilled Spirits" },
  { value: "wine", label: "Wine" },
  { value: "malt_beverage", label: "Malt Beverage" },
];

function StatsCards({ submissions }: { submissions: SubmissionListItem[] }) {
  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === "approved").length;
    const pending = submissions.filter((s) => s.status === "pending").length;
    const needsRevision = submissions.filter(
      (s) => s.status === "needs_revision"
    ).length;
    return { total, approved, pending, needsRevision };
  }, [submissions]);

  const cards = [
    { label: "Total", value: stats.total, color: "text-gray-900" },
    { label: "Approved", value: stats.approved, color: "text-green-600" },
    { label: "Pending", value: stats.pending, color: "text-yellow-600" },
    {
      label: "Needs Revision",
      value: stats.needsRevision,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

function formatDate(timestamp: unknown): string {
  if (!timestamp) return "\u2014";
  const ts = timestamp as { seconds?: number; toDate?: () => Date };
  if (ts.toDate) return ts.toDate().toLocaleDateString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
  return "\u2014";
}

export default function DashboardPage() {
  const router = useRouter();
  const { submissions, loading, error } = useSubmissions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"createdAt" | "status">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let result = submissions;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (productFilter !== "all") {
      result = result.filter((s) => s.productType === productFilter);
    }
    return [...result].sort((a, b) => {
      if (sortKey === "status") {
        const cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const aTime =
        (a.createdAt as unknown as { seconds: number })?.seconds ?? 0;
      const bTime =
        (b.createdAt as unknown as { seconds: number })?.seconds ?? 0;
      return sortDir === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [submissions, statusFilter, productFilter, sortKey, sortDir]);

  const toggleSort = (key: "createdAt" | "status") => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <RequireProfile>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link href="/submissions/new">
            <Button>New Submission</Button>
          </Link>
        </div>

        {loading && <LoadingState message="Loading submissions..." />}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <StatsCards submissions={submissions} />

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {statusFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {productFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                {submissions.length === 0
                  ? "No submissions yet. Create your first submission to get started."
                  : "No submissions match the selected filters."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Brand Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Product Type
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                        onClick={() => toggleSort("createdAt")}
                      >
                        Date{" "}
                        {sortKey === "createdAt" &&
                          (sortDir === "asc" ? "\u2191" : "\u2193")}
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                        onClick={() => toggleSort("status")}
                      >
                        Status{" "}
                        {sortKey === "status" &&
                          (sortDir === "asc" ? "\u2191" : "\u2193")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((sub) => (
                      <tr
                        key={sub.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/submissions/${sub.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-600">
                          {sub.id.slice(0, 8)}...
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.brandName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {productTypeLabels[sub.productType] ??
                            sub.productType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {formatDate(sub.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge
                            status={sub.status as SubmissionStatus}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </RequireProfile>
  );
}
