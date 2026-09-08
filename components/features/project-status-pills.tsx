"use client";

import React from "react";
import type { Database } from "@/lib/supabase/database.types";

type ProjectStatusEnum = Database["public"]["Enums"]["project_status"];

interface StatusOption {
  value: ProjectStatusEnum;
  label: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "not_started",
    label: "Belum Mulai",
    activeColor: "text-text-primary",
    activeBg: "bg-badge-bg-not-started",
    activeBorder: "border-border-hairline-strong",
  },
  {
    value: "in_progress",
    label: "Sedang Dikerjakan",
    activeColor: "text-status-in-progress",
    activeBg: "bg-badge-bg-in-progress",
    activeBorder: "border-status-in-progress/40",
  },
  {
    value: "waiting",
    label: "Menunggu TGE / Snapshot",
    activeColor: "text-status-waiting",
    activeBg: "bg-badge-bg-waiting",
    activeBorder: "border-status-waiting/40",
  },
  {
    value: "ready_to_claim",
    label: "Siap Klaim",
    activeColor: "text-accent",
    activeBg: "bg-badge-bg-ready-claim",
    activeBorder: "border-accent/40",
  },
  {
    value: "completed",
    label: "Selesai",
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
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
