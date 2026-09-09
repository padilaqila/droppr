"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonSecondary } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Bell,
  Clock,
  Edit2,
  Trash2,
  Wallet,
  Copy,
  Check,
  CheckCircle2,
  Send,
  AtSign,
  X,
  Star,
  ShieldCheck,
  Gift,
  ExternalLink,
  AlertTriangle,
  Trophy,
  Repeat,
} from "lucide-react";
import {
  isProjectDailyDone,
  toggleProjectDailyTask,
  updateProjectTaskType,
} from "@/lib/supabase/daily-tasks-helper";
import { toggleProjectPriority } from "@/lib/supabase/priority-helper";
import { ProjectStatusPills } from "@/components/features/project-status-pills";
import { ProjectQuickLinks } from "@/components/features/project-quick-links";
import { ProjectThreadView } from "@/components/features/project-thread-view";
import { AttachWalletModal } from "@/components/features/attach-wallet-modal";
import { SetReminderModal } from "@/components/features/set-reminder-modal";
import { EditProjectModal } from "@/components/features/edit-project-modal";
import { TelegramUpdateModal } from "@/components/features/telegram-update-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { ThreadItem } from "@/lib/supabase/thread-updates";
import { useTranslation } from "@/lib/i18n/context";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectStatusEnum = Database["public"]["Enums"]["project_status"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

interface ProjectDetail extends ProjectRow {
  tasks?: TaskRow[];
  accounts?: AccountRow[];
  wallets?: WalletRow[];
  reminders?: ReminderRow[];
}

interface ProjectDetailClientViewProps {
  project: ProjectDetail;
}

export function ProjectDetailClientView({ project }: ProjectDetailClientViewProps) {
  const router = useRouter();
  const { isEn } = useTranslation();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRow | null>(null);

  const [currentStatus, setCurrentStatus] = useState<ProjectStatusEnum>(project.status);
  const [tasks, setTasks] = useState<TaskRow[]>(project.tasks || []);
  const [reminders, setReminders] = useState<ReminderRow[]>(project.reminders || []);
  const [accounts, setAccounts] = useState<AccountRow[]>(project.accounts || []);
  const [socialLinks, setSocialLinks] = useState<Record<string, any>>(
    (project.social_links as Record<string, any>) || {}
  );
  const [isTogglingDaily, setIsTogglingDaily] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountPlatform, setAccountPlatform] = useState<string>("Discord");
  const [customPlatform, setCustomPlatform] = useState<string>("");
  const [accountValue, setAccountValue] = useState<string>("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadRefreshTrigger, setThreadRefreshTrigger] = useState(0);
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);

  // Sync state when server re-renders after router.refresh() (per MEMORY.md)
  useEffect(() => {
    setCurrentStatus(project.status);
  }, [project.status]);

  useEffect(() => {
    setTasks(project.tasks || []);
  }, [project.tasks]);

  useEffect(() => {
    setReminders(project.reminders || []);
  }, [project.reminders]);

  useEffect(() => {
    setAccounts(project.accounts || []);
  }, [project.accounts]);

  useEffect(() => {
    setSocialLinks((project.social_links as Record<string, any>) || {});
  }, [project.social_links]);

  // Derived: Is today's daily task completed for this project?
  const isTodayDone = isProjectDailyDone({ social_links: socialLinks }, tasks);

  // Toggle Daily Task Done for today (Syncs with Dashboard and auto-resets at 07:00 WIB)
  const handleToggleDailyDone = async () => {
    if (isTogglingDaily) return;
    setIsTogglingDaily(true);

    const nextState = !isTodayDone;
    const nowIso = nextState ? new Date().toISOString() : null;

    // Optimistic UI state updates
    setSocialLinks((prev) => {
      const next = { ...prev };
      if (nowIso) {
        next.last_daily_completed_at = nowIso;
      } else {
        delete next.last_daily_completed_at;
      }
      return next;
    });

    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        status: nextState ? "done" : "pending",
        completed_at: nextState ? nowIso : null,
      }))
    );

    try {
      await toggleProjectDailyTask(project.id, nextState);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle daily task:", err);
      // Revert on error
      setSocialLinks((project.social_links as Record<string, any>) || {});
    } finally {
      setIsTogglingDaily(false);
    }
  };

  const isPriority = Boolean(socialLinks.is_priority);

  const handleTogglePriority = async () => {
    const nextPriority = !isPriority;
    setSocialLinks((prev) => ({
      ...prev,
      is_priority: nextPriority,
    }));

    try {
      await toggleProjectPriority(project.id, isPriority);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle priority:", err);
      setSocialLinks((project.social_links as Record<string, any>) || {});
    }
  };

  // Seamless 1-Click Status Change for Long-term Project Lifecycle (Optimistic UI)
  const handleStatusChange = async (nextStatus: ProjectStatusEnum) => {
    if (nextStatus === currentStatus) return;
    setCurrentStatus(nextStatus);

    try {
      const supabase = createClient() as any;
      await supabase
        .from("projects")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", project.id);
      router.refresh();
    } catch (err) {
      console.error("Failed to update project status:", err);
      setCurrentStatus(project.status);
    }
  };

  const currentTaskType = (socialLinks.task_type as "daily" | "weekly" | "one_time") || "daily";

  // Seamless 1-Click Task Routine Change (Harian, Mingguan, 1x Selesai)
  const handleTaskTypeChange = async (nextType: "daily" | "weekly" | "one_time") => {
    if (nextType === currentTaskType) return;
    setSocialLinks((prev) => ({
      ...prev,
      task_type: nextType,
    }));

    try {
      await updateProjectTaskType(project.id, nextType);
      router.refresh();
    } catch (err) {
      console.error("Failed to update task type:", err);
      setSocialLinks((project.social_links as Record<string, any>) || {});
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm("Hapus pengingat ini?")) return;
    setReminders((prev) => prev.filter((r) => r.id !== id));

    try {
      const supabase = createClient() as any;
      await supabase.from("reminders").delete().eq("id", id);
    } catch (err) {
      console.error("Delete reminder error:", err);
    }
  };

  const handleCopyWallet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWalletId(id);
    setTimeout(() => setCopiedWalletId(null), 2000);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLabel = accountPlatform === "Lainnya" ? customPlatform.trim() : accountPlatform;
    const finalVal = accountValue.trim();

    if (!finalLabel) {
      setAccountError("Pilih atau ketik nama platform akun.");
      return;
    }
    if (!finalVal) {
      setAccountError("Isi username, handle, atau email.");
      return;
    }

    setIsSavingAccount(true);
    setAccountError(null);

    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          project_id: project.id,
          label: finalLabel,
          username_email: finalVal,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAccounts((prev) => [...prev, data]);
      }
      setIsAddingAccount(false);
      setAccountValue("");
      setCustomPlatform("");
    } catch (err: any) {
      console.error("Failed to add account:", err);
      setAccountError(err?.message || (isEn ? "Failed to save account." : "Gagal menyimpan akun."));
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    setDeletingAccountId(id);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleCopyAccount = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccountId(id);
    setTimeout(() => setCopiedAccountId(null), 2000);
  };

  const wallets = project.wallets || [];
  const rawSocial = (project.social_links as Record<string, any>) || {};
  const telegramPostUrl = rawSocial.telegram_post_url as string | undefined;

  return (
    <div className="w-full space-y-4 min-w-0 pb-16 font-sans">
      {/* Top Navigation & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/projects"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isEn ? "Back to projects list" : "Kembali ke daftar project"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTelegramModalOpen(true)}
            className="!py-1 !px-2.5 text-caption rounded-md bg-link-teal/15 border border-link-teal/30 text-link-teal hover:bg-link-teal/25 transition-colors font-medium inline-flex items-center gap-1.5 shadow-sm"
            title={isEn ? "Check updates for this project on Telegram" : "Periksa update proyek ini di Telegram (Airdrop Finder & Duta Crypto)"}
          >
            <Send className="w-3 h-3" />
            <span>{isEn ? "Check TG Updates" : "Cek Update TG"}</span>
          </button>

          <ButtonSecondary
            onClick={() => setIsEditProjectModalOpen(true)}
            className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1"
            title={isEn ? "Edit Project Details & Links" : "Edit Detail & Tautan Proyek"}
          >
            <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
            <span>{isEn ? "Edit Info" : "Edit Info"}</span>
          </ButtonSecondary>
        </div>
      </div>

      {/* Header Card: Title, Chain, and 1-Click Status Pills (Liquid Frosted Glass) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
                {project.name}
              </h1>

              {/* Priority Toggle Button */}
              <button
                type="button"
                onClick={handleTogglePriority}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-caption font-semibold transition-all border ${
                  isPriority
                    ? "bg-accent/20 text-accent border-accent/40 shadow-xs hover:bg-accent/25"
                    : "bg-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] border-white/[0.08]"
                }`}
                title={
                  isPriority
                    ? (isEn ? "Priority Project (Protected from delete) - Click to unmark" : "Proyek Prioritas (Terlindungi dari hapus) - Klik untuk lepas")
                    : (isEn ? "Mark as Priority" : "Tandai sebagai Prioritas")
                }
              >
                <Star className={`w-3.5 h-3.5 ${isPriority ? "fill-current text-accent" : ""}`} />
                <span>{isPriority ? (isEn ? "⭐ Priority" : "⭐ Prioritas") : (isEn ? "Mark Priority" : "Jadikan Prioritas")}</span>
                {isPriority && (
                  <ShieldCheck className="w-3 h-3 text-accent shrink-0 ml-0.5" />
                )}
              </button>
            </div>
            <p className="text-caption text-text-secondary font-mono mt-1 flex items-center gap-1.5">
              <span>Network/Chain:</span>
              <span className="text-text-primary font-semibold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                {project.chain || (isEn ? "Not specified" : "Belum ditentukan")}
              </span>
            </p>
          </div>

          {/* 1-Click Status & Routine Controls */}
          <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
            {/* 1-Click Routine Schedule */}
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[11px] font-medium text-text-tertiary">
                {isEn ? "Task Routine (1-Click):" : "Tipe Rutinitas (1-Klik):"}
              </span>
              <div className="inline-flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                {[
                  {
                    type: "daily" as const,
                    label: isEn ? "⚡ Daily" : "⚡ Harian",
                    title: isEn ? "Daily check-in / streak (resets 07:00 WIB)" : "Check-in / streak harian (reset 07:00 WIB)",
                  },
                  {
                    type: "weekly" as const,
                    label: isEn ? "🔄 Weekly" : "🔄 Mingguan",
                    title: isEn ? "Periodic weekly volume / bridge" : "Rutin mingguan (transaksi / volume berkala)",
                  },
                  {
                    type: "one_time" as const,
                    label: isEn ? "🎯 One-Time" : "🎯 1x Selesai",
                    title: isEn ? "One-time execution (testnet / form / faucet)" : "Sekali selesai (form, faucet, atau testnet 1x jalan)",
                  },
                ].map((item) => {
                  const isActive = currentTaskType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleTaskTypeChange(item.type)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isActive
                          ? "bg-accent/20 text-accent border border-accent/40 shadow-xs"
                          : "text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border border-transparent"
                      }`}
                      title={item.title}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1-Click Status Pills */}
            <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto overflow-hidden">
              <span className="text-[11px] font-medium text-text-tertiary">
                {isEn ? "Project Lifecycle:" : "Status Siklus Hidup:"}
              </span>
              <ProjectStatusPills
                currentStatus={currentStatus}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        </div>

        {/* Action Controls: Routine execution & Reminders */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Routine Completion Action Button */}
            {currentTaskType === "daily" && (
              <>
                <button
                  type="button"
                  onClick={handleToggleDailyDone}
                  disabled={isTogglingDaily}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all shadow-sm ${
                    isTodayDone
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30"
                  }`}
                  title={
                    isTodayDone
                      ? (isEn
                          ? "Today's tasks completed! Click if you want to reopen."
                          : "Tugas hari ini sudah selesai dikerjakan! Klik jika ingin membuka kembali.")
                      : (isEn
                          ? "Mark today's tasks as done (syncs with Dashboard & resets at 07:00 WIB tomorrow)"
                          : "Tandai tugas hari ini sudah dikerjakan (sinkron dengan Dashboard & reset besok jam 07:00 WIB)")
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {isTodayDone
                      ? (isEn ? "✓ Today Done (Reopen)" : "✓ Tugas Hari Ini Selesai (Buka Kembali)")
                      : (isEn ? "Mark Done Today" : "Tandai Selesai Hari Ini")}
                  </span>
                </button>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-text-tertiary">
                  <Clock className="w-3 h-3 text-amber-400/80" />
                  <span>Reset: 07:00 WIB</span>
                </div>
              </>
            )}

            {currentTaskType === "weekly" && (
              <>
                <button
                  type="button"
                  onClick={handleToggleDailyDone}
                  disabled={isTogglingDaily}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all shadow-sm ${
                    isTodayDone
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30"
                      : "bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30"
                  }`}
                  title={
                    isTodayDone
                      ? (isEn
                          ? "Weekly interaction completed! Click if you want to reopen."
                          : "Interaksi mingguan sudah selesai! Klik jika ingin membuka kembali.")
                      : (isEn
                          ? "Mark weekly volume/interaction as completed"
                          : "Tandai interaksi/volume mingguan sudah selesai dikerjakan")
                  }
                >
                  <Repeat className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {isTodayDone
                      ? (isEn ? "✓ Weekly Done (Reopen)" : "✓ Rutinitas Minggu Ini Selesai (Buka Kembali)")
                      : (isEn ? "Mark Done This Week" : "Tandai Selesai Minggu Ini")}
                  </span>
                </button>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-text-tertiary">
                  <Repeat className="w-3 h-3 text-blue-400" />
                  <span>Siklus: Rutin Mingguan</span>
                </div>
              </>
            )}

            {currentTaskType === "one_time" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-caption font-medium text-text-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEn ? "1-Time Execution (Set & Forget)" : "1x Eksekusi (Set & Forget)"}</span>
              </div>
            )}

            {/* Reminder Control Button */}
            <button
              type="button"
              onClick={() => {
                setEditingReminder(reminders[0] || null);
                setIsReminderModalOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption font-medium transition-all ${
                reminders.length > 0
                  ? "bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25"
                  : "bg-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] border-white/[0.08]"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-accent" />
              <span>
                {reminders.length > 0
                  ? (isEn ? `Active Reminders (${reminders.length})` : `Pengingat Aktif (${reminders.length})`)
                  : (isEn ? "+ Set Reminder" : "+ Pasang Pengingat")}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-caption text-text-tertiary">
            <span className="text-[11px] font-mono">
              {isEn ? "Last updated: " : "Terakhir diperbarui: "}
              {new Date(project.updated_at).toLocaleDateString(isEn ? "en-US" : "id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Quick Launch & Resource Action Bar */}
        <ProjectQuickLinks
          socialLinks={project.social_links as Record<string, any>}
          wallets={wallets}
          onOpenEditModal={() => setIsEditProjectModalOpen(true)}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
        />
      </div>

      {/* Lifecycle Special Banners */}
      {currentStatus === "ready_to_claim" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Gift className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-body font-bold text-amber-300">
                  {isEn ? "🎁 Airdrop is Ready to Claim!" : "🎁 Airdrop Siap Diklaim!"}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  TGE / Allocation Live
                </span>
              </div>
              <p className="text-caption text-text-secondary mt-0.5">
                {isEn
                  ? "Token claim or allocation checker portal is now active. Verify your wallet and claim your tokens."
                  : "Portal klaim token / checker alokasi sudah aktif. Cek wallet Anda dan klaim token garapan Anda."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {socialLinks.claim_url ? (
              <a
                href={socialLinks.claim_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-bg-base font-bold text-caption hover:bg-accent/90 transition-all shadow-md shadow-amber-500/20"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{isEn ? "Open Claim Portal" : "Buka Portal Klaim"}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditProjectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold text-caption hover:bg-amber-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? "+ Set Claim Portal URL" : "+ Pasang Link Portal Klaim"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleStatusChange("completed")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold text-caption hover:bg-emerald-500/30 transition-all"
              title={isEn ? "Mark as claimed & completed" : "Tandai sudah berhasil diklaim & selesai"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEn ? "Mark as Claimed" : "Tandai Sudah Diklaim"}</span>
            </button>
          </div>
        </div>
      )}

      {currentStatus === "waiting" && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-body font-bold text-purple-300">
                  {isEn ? "⛔ Testnet Concluded / Waiting for Snapshot" : "⛔ Fase Testnet Berakhir / Menunggu Snapshot"}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  STOP Spending Gas
                </span>
              </div>
              <p className="text-caption text-text-secondary mt-0.5">
                {isEn
                  ? "Do not waste transaction fees or gas. Wait for team announcements regarding snapshot and allocation."
                  : "Hentikan transaksi dan buang gas fee. Cukup pantau pengumuman resmi terkait snapshot dan alokasi."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleStatusChange("ready_to_claim")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold text-caption hover:bg-amber-400/30 transition-all"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{isEn ? "Move to Ready to Claim 🎁" : "Pindahkan ke Siap Klaim 🎁"}</span>
            </button>
          </div>
        </div>
      )}

      {currentStatus === "completed" && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-body font-bold text-emerald-300">
                {isEn ? "🏆 Airdrop Successfully Claimed & Finished!" : "🏆 Airdrop Selesai & Sukses Diklaim!"}
              </h4>
              <p className="text-caption text-text-secondary mt-0.5">
                {isEn
                  ? "Rewards have been received in your wallet. Great work, Hunter!"
                  : "Reward telah berhasil masuk ke wallet Anda. Mantap, garapan ini selesai!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleStatusChange("in_progress")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] text-text-secondary border border-white/[0.1] font-semibold text-caption hover:bg-white/[0.1] hover:text-text-primary transition-all"
            >
              <span>{isEn ? "Reopen Project" : "Buka Kembali Proyek"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dual-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN: Main Execution Hub (Threads / Thread X Timeline) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-4">
          <ProjectThreadView
            projectId={project.id}
            projectName={project.name}
            projectChain={project.chain}
            guideContent={project.guide_content}
            socialLinks={project.social_links as Record<string, any>}
            projectCreatedAt={project.created_at}
            onOpenTelegramSearch={() => setIsTelegramModalOpen(true)}
            refreshTrigger={threadRefreshTrigger}
            onThreadsLoaded={setThreads}
            onThreadsChange={setThreads}
          />
        </div>

        {/* RIGHT COLUMN: Utility, Reminders, Wallets & Accounts */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-4">
          {/* Widget 1: Pengingat / Alarm Proyek */}
          <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Reminders" : "Pengingat"} ({reminders.length})
                </h3>
              </div>
              <ButtonSecondary
                onClick={() => {
                  setEditingReminder(null);
                  setIsReminderModalOpen(true);
                }}
                className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1 rounded-xl bg-white/[0.03] border-white/[0.08]"
              >
                <Plus className="w-3 h-3" />
                <span>{isEn ? "Set" : "Pasang"}</span>
              </ButtonSecondary>
            </div>

            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map((rem) => {
                  const dateStr = rem.next_trigger_at
                    ? new Date(rem.next_trigger_at).toLocaleDateString(isEn ? "en-US" : "id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : (isEn ? "Not set" : "Belum diatur");
                  const isPast = rem.next_trigger_at
                    ? new Date(rem.next_trigger_at).getTime() < Date.now()
                    : false;

                  return (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-xl border text-caption flex items-center justify-between gap-2 transition-all ${
                        isPast
                          ? "bg-status-overdue/10 border-status-overdue/30 text-status-overdue"
                          : "bg-white/[0.02] border-white/[0.06] text-text-primary"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                        <span className="text-[10px] text-text-tertiary capitalize font-mono">
                          {rem.frequency === "once"
                            ? (isEn ? "Once" : "Sekali")
                            : rem.frequency === "daily"
                            ? (isEn ? "Daily" : "Harian")
                            : rem.frequency === "weekly"
                            ? (isEn ? "Weekly" : "Mingguan")
                            : rem.frequency}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReminder(rem);
                            setIsReminderModalOpen(true);
                          }}
                          className="p-1.5 text-text-tertiary hover:text-text-primary rounded-lg hover:bg-white/[0.05] transition-colors"
                          title={isEn ? "Edit reminder" : "Ubah pengingat"}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1.5 text-text-tertiary hover:text-status-overdue rounded-lg hover:bg-white/[0.05] transition-colors"
                          title={isEn ? "Delete reminder" : "Hapus pengingat"}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-caption text-text-tertiary">
                {isEn
                  ? "No scheduled reminders for this project."
                  : "Belum ada pengingat terjadwal untuk proyek ini."}
              </p>
            )}
          </div>

          {/* Widget 2: Wallet Terhubung */}
          <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Wallets" : "Wallet"} ({wallets.length})
                </h3>
              </div>
              <ButtonSecondary
                onClick={() => setIsWalletModalOpen(true)}
                className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1 rounded-xl bg-white/[0.03] border-white/[0.08]"
              >
                <Plus className="w-3 h-3" />
                <span>{isEn ? "Manage" : "Atur"}</span>
              </ButtonSecondary>
            </div>

            {wallets.length > 0 ? (
              <div className="space-y-2">
                {wallets.map((w) => {
                  const isCopied = copiedWalletId === w.id;
                  const shortAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;

                  return (
                    <div
                      key={w.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-caption font-semibold text-text-primary truncate">
                          {w.label || "Wallet"}
                        </div>
                        <div className="text-[11px] font-mono text-text-secondary">
                          {shortAddr}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyWallet(w.id, w.address)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/[0.05] transition-colors shrink-0"
                        title={isEn ? "Copy Address" : "Salin Address"}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-status-completed" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-caption text-text-tertiary">
                {isEn
                  ? "No wallets assigned to this project."
                  : "Belum ada wallet dipasangkan ke proyek ini."}
              </p>
            )}
          </div>

          {/* Widget 3: Akun Terkait (Non-sensitif) */}
          <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-caption text-text-tertiary">
                <AtSign className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="font-semibold text-text-primary">
                  {isEn ? "Linked Accounts" : "Akun Terkait"}
                </span>
              </div>

              {!isAddingAccount ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAccount(true);
                    setAccountError(null);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-caption font-medium bg-bg-elevated hover:bg-bg-elevated-2 text-accent border border-border-hairline transition-colors"
                  title={isEn ? "Add account notes used for this airdrop" : "Tambah catatan akun yang digunakan untuk airdrop ini"}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEn ? "Add" : "Tambah"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAccount(false);
                    setAccountError(null);
                  }}
                  className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
                  title={isEn ? "Cancel" : "Batal"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Inline Add Account Form */}
            {isAddingAccount && (
              <form onSubmit={handleAddAccount} className="p-3 rounded-lg bg-bg-elevated-2 border border-border-hairline space-y-2.5">
                <div>
                  <CustomSelect
                    label={isEn ? "Platform / Label" : "Platform / Label"}
                    value={accountPlatform}
                    onChange={(val) => setAccountPlatform(val)}
                    size="sm"
                    options={[
                      { value: "Discord", label: "Discord" },
                      { value: "Twitter / X", label: "Twitter / X" },
                      { value: "Telegram", label: "Telegram" },
                      { value: "Email", label: "Email" },
                      { value: "GitHub", label: "GitHub" },
                      { value: "Google", label: "Google" },
                      { value: "TikTok", label: "TikTok" },
                      { value: "Lainnya", label: isEn ? "Other..." : "Lainnya..." },
                    ]}
                  />
                </div>

                {accountPlatform === "Lainnya" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-text-secondary uppercase">
                      {isEn ? "Platform Name" : "Nama Platform"}
                    </label>
                    <input
                      type="text"
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      placeholder={isEn ? "e.g. Reddit, Medium, Galxe" : "Misal: Reddit, Medium, Galxe"}
                      className="w-full px-2.5 py-1.5 rounded-md bg-bg-elevated border border-border-hairline text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-secondary uppercase">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    value={accountValue}
                    onChange={(e) => setAccountValue(e.target.value)}
                    placeholder={isEn ? "@handle or user@email.com" : "@handle atau user@email.com"}
                    className="w-full px-2.5 py-1.5 rounded-md bg-bg-elevated border border-border-hairline text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono"
                    autoFocus
                  />
                </div>

                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-tight">
                  ⚠️ <strong>{isEn ? "Non-sensitive:" : "Non-sensitif:"}</strong>{" "}
                  {isEn
                    ? "Only save username/email. Never enter passwords or seed phrases."
                    : "Hanya simpan username/email. Dilarang memasukkan password atau seed phrase."}
                </div>

                {accountError && (
                  <p className="text-[11px] text-status-danger">{accountError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAccount(false);
                      setAccountError(null);
                    }}
                    className="px-2.5 py-1 rounded text-caption text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {isEn ? "Cancel" : "Batal"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAccount}
                    className="px-3 py-1 rounded bg-accent text-on-accent text-caption font-semibold hover:bg-accent-pressed transition-colors disabled:opacity-50"
                  >
                    {isSavingAccount
                      ? (isEn ? "Saving..." : "Menyimpan...")
                      : (isEn ? "Save Account" : "Simpan Akun")}
                  </button>
                </div>
              </form>
            )}

            {/* List of Accounts */}
            {accounts.length > 0 ? (
              <div className="space-y-1.5">
                {accounts.map((acc) => {
                  const isCopied = copiedAccountId === acc.id;
                  const isDeleting = deletingAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className="p-2 rounded-md bg-bg-elevated-2 border border-border-subtle hover:border-border-hairline text-caption flex items-center justify-between gap-2 transition-colors font-mono"
                    >
                      <div className="min-w-0 flex items-center gap-1.5 truncate">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-bg-elevated text-accent border border-border-subtle shrink-0">
                          {acc.label}
                        </span>
                        <span className="text-text-primary truncate font-mono text-[11px]" title={acc.username_email}>
                          {acc.username_email}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(acc.id, acc.username_email)}
                          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                          title={isEn ? "Copy username / email" : "Salin username / email"}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-status-completed" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.id)}
                          disabled={isDeleting}
                          className="p-1 rounded text-text-tertiary hover:text-status-danger hover:bg-bg-elevated transition-colors disabled:opacity-40"
                          title={isEn ? "Delete this account" : "Hapus akun ini"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isAddingAccount ? (
              <div className="py-2 text-center space-y-1.5">
                <p className="text-caption text-text-tertiary leading-relaxed">
                  {isEn
                    ? "No linked accounts saved. Note down Discord, X, or email usernames used for this airdrop so you don't forget."
                    : "Belum ada akun tersimpan. Catat username Discord, X, atau email yang Anda gunakan untuk garapan ini agar tidak lupa."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium bg-bg-elevated hover:bg-bg-elevated-2 text-accent border border-border-hairline transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEn ? "Add Account" : "Tambah Akun"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        project={project}
        onProjectUpdated={() => router.refresh()}
      />

      <AttachWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        projectId={project.id}
        assignedWalletIds={wallets.map((w) => w.id)}
        onWalletsUpdated={() => router.refresh()}
      />

      <SetReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        defaultProjectId={project.id}
        editingReminder={editingReminder}
        onReminderSaved={() => router.refresh()}
      />

      <TelegramUpdateModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        projectName={project.name}
        projectId={project.id}
        telegramPostUrl={telegramPostUrl}
        existingThreads={threads}
        onThreadAdded={() => {
          setThreadRefreshTrigger((prev) => prev + 1);
          router.refresh();
        }}
        onThreadDeleted={(deletedId) => {
          setThreads((prev) => prev.filter((t) => t.id !== deletedId));
          setThreadRefreshTrigger((prev) => prev + 1);
          router.refresh();
        }}
      />
    </div>
  );
}
