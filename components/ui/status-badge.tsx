"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";

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
  { defaultLabelId: string; defaultLabelEn: string; bgClass: string; textClass: string }
> = {
  "not-started": {
    defaultLabelId: "Belum Mulai",
    defaultLabelEn: "Not Started",
    bgClass: "bg-badge-bg-not-started",
    textClass: "text-status-not-started",
  },
  "in-progress": {
    defaultLabelId: "Sedang Dikerjakan",
    defaultLabelEn: "In Progress",
    bgClass: "bg-badge-bg-in-progress",
    textClass: "text-status-in-progress",
  },
  waiting: {
    defaultLabelId: "Menunggu TGE/Snapshot",
    defaultLabelEn: "Waiting TGE/Snapshot",
    bgClass: "bg-badge-bg-waiting",
    textClass: "text-status-waiting",
  },
  "ready-claim": {
    defaultLabelId: "Siap Klaim",
    defaultLabelEn: "Ready to Claim",
    bgClass: "bg-badge-bg-ready-claim",
    textClass: "text-status-ready-claim",
  },
  completed: {
    defaultLabelId: "Selesai",
    defaultLabelEn: "Completed",
    bgClass: "bg-badge-bg-completed",
    textClass: "text-status-completed",
  },
  overdue: {
    defaultLabelId: "Terlambat",
    defaultLabelEn: "Overdue",
    bgClass: "bg-badge-bg-overdue",
    textClass: "text-status-overdue",
  },
};

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const { isEn } = useTranslation();
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center text-caption font-medium rounded-full px-[10px] py-[3px] ${config.bgClass} ${config.textClass} ${className}`.trim()}
    >
      {label || (isEn ? config.defaultLabelEn : config.defaultLabelId)}
    </span>
  );
}
