"use client";

import React from "react";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

type ProjectStatusEnum = Database["public"]["Enums"]["project_status"];

interface StatusOption {
  value: ProjectStatusEnum;
  labelId: string;
  labelEn: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "not_started",
    labelId: "Belum Mulai",
    labelEn: "Not Started",
    activeColor: "text-text-primary",
    activeBg: "bg-badge-bg-not-started",
    activeBorder: "border-border-hairline-strong",
  },
  {
    value: "in_progress",
    labelId: "Sedang Dikerjakan",
    labelEn: "In Progress",
    activeColor: "text-status-in-progress",
    activeBg: "bg-badge-bg-in-progress",
    activeBorder: "border-status-in-progress/40",
  },
  {
    value: "waiting",
    labelId: "Menunggu TGE / Snapshot",
    labelEn: "Waiting TGE / Snapshot",
    activeColor: "text-status-waiting",
    activeBg: "bg-badge-bg-waiting",
    activeBorder: "border-status-waiting/40",
  },
  {
    value: "ready_to_claim",
    labelId: "Siap Klaim",
    labelEn: "Ready to Claim",
    activeColor: "text-accent",
    activeBg: "bg-badge-bg-ready-claim",
    activeBorder: "border-accent/40",
  },
  {
    value: "completed",
    labelId: "Selesai",
    labelEn: "Completed",
    activeColor: "text-status-completed",
    activeBg: "bg-badge-bg-completed",
    activeBorder: "border-status-completed/40",
  },
];

interface ProjectStatusPillsProps {
  currentStatus: ProjectStatusEnum;
  onStatusChange: (status: ProjectStatusEnum) => void;
  disabled?: boolean;
}

export function ProjectStatusPills({
  currentStatus,
  onStatusChange,
  disabled = false,
}: ProjectStatusPillsProps) {
  const { isEn } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
      {statusOptions.map((opt) => {
        const isActive = currentStatus === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onStatusChange(opt.value)}
            className={`px-3 py-1 rounded-md text-caption font-medium border transition-all shrink-0 select-none ${
              isActive
                ? `${opt.activeBg} ${opt.activeColor} ${opt.activeBorder} shadow-sm font-semibold`
                : "bg-bg-elevated text-text-tertiary border-border-hairline hover:text-text-primary hover:bg-bg-elevated-2 hover:border-border-hairline-strong"
            }`}
          >
            {isEn ? opt.labelEn : opt.labelId}
          </button>
        );
      })}
    </div>
  );
}
