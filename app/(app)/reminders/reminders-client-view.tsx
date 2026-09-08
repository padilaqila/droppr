"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import {
  Bell,
  Plus,
  Clock,
  Trash2,
  Edit2,
  ExternalLink,
  Layers,
  ArrowRight,
  Repeat,
  Calendar,
} from "lucide-react";
import { SetReminderModal } from "@/components/features/set-reminder-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  formatReminderSchedule,
  decodeFrequency,
  isReminderActiveToday,
} from "@/lib/supabase/reminders-helper";

type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

export interface EnrichedReminder extends ReminderRow {
  projects?: {
    id: string;
    name: string;
    chain: string | null;
    status?: string | null;
    social_links?: any;
  } | null;
  tasks?: { id: string; title: string } | null;
}

interface RemindersClientViewProps {
  initialReminders: EnrichedReminder[];
}

export function RemindersClientView({ initialReminders }: RemindersClientViewProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<EnrichedReminder[]>(initialReminders);
  const [activeFilter, setActiveFilter] = useState<"all" | "daily" | "weekly" | "once" | "today">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRow | null>(null);

  // Sync state when server re-renders after router.refresh() (per MEMORY.md)
  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jadwal pengingat untuk proyek ini?")) return;
    try {
      const supabase = createClient() as any;
      await supabase.from("reminders").delete().eq("id", id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const handleEdit = (reminder: EnrichedReminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
  };

  // Helper formatting human-readable next trigger dates
  const formatTriggerTime = (isoString: string | null) => {
    if (!isoString) {
      return { formattedDate: "Belum diatur", relativeText: "-", isPast: false };
    }
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let relativeText = "";
    if (diffMs < 0) {
      if (Math.abs(diffHours) < 24) {
        relativeText = `${Math.abs(diffHours)} jam yang lalu`;
      } else {
        relativeText = `${Math.abs(diffDays)} hari yang lalu`;
      }
    } else {
      if (diffHours < 1) {
        relativeText = "sebentar lagi";
      } else if (diffHours < 24) {
        relativeText = `dalam ${diffHours} jam`;
      } else if (diffDays === 1) {
        relativeText = "besok";
      } else {
        relativeText = `dalam ${diffDays} hari`;
      }
    }

    const formattedDate = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    return { formattedDate, relativeText, isPast: diffMs < 0 };
  };

  const filteredReminders = reminders.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "today") {
      return isReminderActiveToday(r.frequency);
    }
    const decoded = decodeFrequency(r.frequency);
    return decoded.scheduleType === activeFilter;
  });

  const dailyCount = reminders.filter(
    (r) => decodeFrequency(r.frequency).scheduleType === "daily"
  ).length;

  const weeklyCount = reminders.filter(
    (r) => decodeFrequency(r.frequency).scheduleType === "weekly"
  ).length;

  const onceCount = reminders.filter(
    (r) => decodeFrequency(r.frequency).scheduleType === "once"
  ).length;

  const todayCount = reminders.filter((r) => isReminderActiveToday(r.frequency)).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary">
            Pengingat Proyek Airdrop
          </h1>
          <p className="text-body-sm text-text-secondary">
            Atur jadwal notifikasi rutin (Setiap Hari, Hari Tertentu, atau Tanggal Khusus pada default 07:00 pagi) untuk setiap proyek airdrop kamu.
          </p>
        </div>
        <div>
          <ButtonPrimary
            onClick={() => {
              setEditingReminder(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-on-accent" />
            <span>Pasang Pengingat Proyek</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-hairline pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors shrink-0 ${
            activeFilter === "all"
              ? "bg-accent text-on-accent font-semibold"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
          }`}
        >
          Semua Pengingat ({reminders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("today")}
          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors shrink-0 ${
            activeFilter === "today"
              ? "bg-accent text-on-accent font-semibold"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
          }`}
        >
          Jadwal Hari Ini ({todayCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("daily")}
          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors shrink-0 ${
            activeFilter === "daily"
              ? "bg-accent text-on-accent font-semibold"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
          }`}
        >
          Setiap Hari ({dailyCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("weekly")}
          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors shrink-0 ${
            activeFilter === "weekly"
              ? "bg-accent text-on-accent font-semibold"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
          }`}
        >
          Hari Tertentu ({weeklyCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("once")}
          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors shrink-0 ${
            activeFilter === "once"
              ? "bg-accent text-on-accent font-semibold"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
          }`}
        >
          Tanggal Spesifik ({onceCount})
        </button>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <CardBase className="text-center py-14 space-y-3">
          <Bell className="w-10 h-10 text-text-tertiary mx-auto mb-1" />
          <h3 className="text-heading-3 font-semibold text-text-primary">
            {activeFilter === "today"
              ? "Tidak ada pengingat proyek untuk hari ini"
              : "Belum ada pengingat proyek yang diatur"}
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            Pasang alarm pengingat harian atau mingguan agar kamu selalu siap menggarap check-in, transaksi harian, atau snapshot reward tepat waktu.
          </p>
          <div className="pt-2">
            <ButtonPrimary
              onClick={() => {
                setEditingReminder(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-on-accent" />
              <span>Atur Pengingat Pertama</span>
            </ButtonPrimary>
          </div>
        </CardBase>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredReminders.map((r) => {
            const timeInfo = formatTriggerTime(r.next_trigger_at);
            const projectName = r.projects?.name || "Proyek Tidak Diketahui";
            const projectStatus = (r.projects?.status?.replace("_", "-") as ProjectStatus) || "in-progress";
            const rawSocial = (r.projects?.social_links as Record<string, any>) || {};
            const dappUrl = rawSocial.dapp_url || rawSocial.website;
            const faucetUrl = rawSocial.faucet_url;

            const scheduleDisplay = formatReminderSchedule(r.frequency);
            const decoded = decodeFrequency(r.frequency);
            const isToday = isReminderActiveToday(r.frequency);

            return (
              <div
                key={r.id}
                className="p-4 rounded-lg bg-bg-elevated border border-border-hairline hover:border-border-hairline-strong transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                {/* Left info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                      isToday
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-bg-elevated-2 border-border-hairline text-text-tertiary"
                    }`}
                  >
                    {decoded.scheduleType === "daily" ? (
                      <Repeat className="w-5 h-5" />
                    ) : decoded.scheduleType === "weekly" ? (
                      <Calendar className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.projects?.id ? (
                        <Link
                          href={`/projects/${r.projects.id}`}
                          prefetch={false}
                          className="text-body-md font-bold text-text-primary hover:text-accent transition-colors"
                        >
                          {projectName}
                        </Link>
                      ) : (
                        <span className="text-body-md font-bold text-text-primary">
                          {projectName}
                        </span>
                      )}

                      {r.projects?.chain && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline font-mono text-text-tertiary">
                          {r.projects.chain}
                        </span>
                      )}

                      <StatusBadge status={projectStatus} />

                      {isToday && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-completed/15 text-status-completed font-semibold border border-status-completed/30">
                          Jadwal Hari Ini
                        </span>
                      )}
                    </div>

                    {/* Schedule Badge */}
                    <div className="flex items-center gap-2 text-body-sm text-text-secondary pt-0.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-accent">
                        <Clock className="w-3.5 h-3.5" />
                        {scheduleDisplay}
                      </span>
                    </div>

                    {/* Next trigger timestamp */}
                    <div className="flex items-center gap-2 text-caption text-text-tertiary font-mono">
                      <span>Pemicu berikutnya:</span>
                      <span className="text-text-primary font-medium">
                        {timeInfo.formattedDate}
                      </span>
                      <span>({timeInfo.relativeText})</span>
                    </div>
                  </div>
                </div>

                {/* Right Actions & Direct Links */}
                <div className="flex items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-border-hairline">
                  {/* Direct Launch Links */}
                  <div className="flex items-center gap-1.5">
                    {dappUrl && (
                      <a
                        href={dappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-caption font-semibold"
                        title="Buka Web App DApp"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>DApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {faucetUrl && (
                      <a
                        href={faucetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-bg-elevated-2 border border-border-hairline text-accent hover:border-accent transition-colors text-caption font-medium"
                        title="Buka Faucet Testnet"
                      >
                        <span>Faucet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {r.projects?.id && (
                      <Link
                        href={`/projects/${r.projects.id}`}
                        prefetch={false}
                        className="p-1.5 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-elevated-2 transition-colors"
                        title="Buka Workstation Proyek"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1 pl-2 border-l border-border-hairline">
                    <ButtonSecondary
                      onClick={() => handleEdit(r)}
                      className="!py-1.5 !px-2.5 text-caption inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </ButtonSecondary>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-status-overdue transition-colors"
                      title="Hapus Pengingat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Set / Edit Reminder Modal */}
      <SetReminderModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingReminder={editingReminder}
        onReminderSaved={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
