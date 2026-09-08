import React from "react";

export type ProjectStatus =
  | "not-started"
  | "in-progress"
  | "waiting"
  | "ready-claim"
  | "completed"
  | "overdue";

interface StatusBadgeProps {
  status: ProjectStatus;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  { defaultLabel: string; bgClass: string; textClass: string }
> = {
  "not-started": {
    defaultLabel: "Belum Mulai",
    bgClass: "bg-badge-bg-not-started",
    textClass: "text-status-not-started",
  },
  "in-progress": {
    defaultLabel: "Sedang Dikerjakan",
    bgClass: "bg-badge-bg-in-progress",
    textClass: "text-status-in-progress",
  },
  waiting: {
    defaultLabel: "Menunggu TGE/Snapshot",
    bgClass: "bg-badge-bg-waiting",
    textClass: "text-status-waiting",
  },
  "ready-claim": {
    defaultLabel: "Siap Klaim",
    bgClass: "bg-badge-bg-ready-claim",
    textClass: "text-status-ready-claim",
  },
  completed: {
    defaultLabel: "Selesai",
    bgClass: "bg-badge-bg-completed",
    textClass: "text-status-completed",
  },
  overdue: {
    defaultLabel: "Overdue",
    bgClass: "bg-badge-bg-overdue",
    textClass: "text-status-overdue",
  },
};

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center text-caption font-medium rounded-full px-[10px] py-[3px] ${config.bgClass} ${config.textClass} ${className}`.trim()}
    >
      {label || config.defaultLabel}
    </span>
  );
}
