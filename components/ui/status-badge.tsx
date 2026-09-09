"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";

export type ProjectStatus =
  | "not-started"
  | "in-progress"
  | "waiting"
  | "ready-claim"
  | "completed"
  | "overdue"
  | "not_started"
  | "in_progress"
  | "ready_to_claim"
  | "ready-to-claim"
  | "ready-to_claim"
  | (string & {});

interface StatusBadgeProps {
  status?: ProjectStatus | null;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { defaultLabelId: string; defaultLabelEn: string; bgClass: string; textClass: string }
> = {
  "not-started": {
    defaultLabelId: "Belum Mulai",
    defaultLabelEn: "Not Started",
    bgClass: "bg-badge-bg-not-started",
    textClass: "text-status-not-started",
  },
  not_started: {
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
  in_progress: {
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
  ready_to_claim: {
    defaultLabelId: "Siap Klaim",
    defaultLabelEn: "Ready to Claim",
    bgClass: "bg-badge-bg-ready-claim",
    textClass: "text-status-ready-claim",
  },
  "ready-to-claim": {
    defaultLabelId: "Siap Klaim",
    defaultLabelEn: "Ready to Claim",
    bgClass: "bg-badge-bg-ready-claim",
    textClass: "text-status-ready-claim",
  },
  "ready-to_claim": {
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

const fallbackConfig = {
  defaultLabelId: "Belum Mulai",
  defaultLabelEn: "Not Started",
  bgClass: "bg-badge-bg-not-started",
  textClass: "text-status-not-started",
};

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const { isEn } = useTranslation();
  const rawStatus = (status || "").toLowerCase().trim();

  let config = statusConfig[rawStatus];
  if (!config) {
    const normalized = rawStatus.replace(/_/g, "-");
    config = statusConfig[normalized];
  }
  if (!config) {
    if (rawStatus.includes("claim")) config = statusConfig["ready-claim"];
    else if (rawStatus.includes("progress")) config = statusConfig["in-progress"];
    else if (rawStatus.includes("wait")) config = statusConfig["waiting"];
    else if (rawStatus.includes("done") || rawStatus.includes("complete")) config = statusConfig["completed"];
    else config = fallbackConfig;
  }

  return (
    <span
      className={`inline-flex items-center text-caption font-medium rounded-full px-[10px] py-[3px] ${config.bgClass} ${config.textClass} ${className}`.trim()}
    >
      {label || (isEn ? config.defaultLabelEn : config.defaultLabelId)}
    </span>
  );
}
