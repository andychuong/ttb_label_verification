type Status = "pending" | "approved" | "needs_revision" | "rejected";

const statusConfig: Record<Status, { label: string; classes: string }> = {
  pending: {
    label: "Pending",
    classes: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Approved",
    classes: "bg-green-100 text-green-800",
  },
  needs_revision: {
    label: "Needs Revision",
    classes: "bg-orange-100 text-orange-800",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-800",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
