"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { ButtonSecondary } from "@/components/ui/button";
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
  ShieldAlert,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { ProjectStatusPills } from "@/components/features/project-status-pills";
import { ProjectQuickLinks } from "@/components/features/project-quick-links";
import { InteractiveTaskList } from "@/components/features/interactive-task-list";
import { ProjectThreadView } from "@/components/features/project-thread-view";
import { AttachWalletModal } from "@/components/features/attach-wallet-modal";
import { SetReminderModal } from "@/components/features/set-reminder-modal";
import { EditProjectModal } from "@/components/features/edit-project-modal";
import { TelegramUpdateModal } from "@/components/features/telegram-update-modal";
import { GuideViewer } from "@/components/features/guide-viewer";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { ThreadItem } from "@/lib/supabase/thread-updates";

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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRow | null>(null);

  const [currentStatus, setCurrentStatus] = useState<ProjectStatusEnum>(project.status);
  const [tasks, setTasks] = useState<TaskRow[]>(project.tasks || []);
  const [reminders, setReminders] = useState<ReminderRow[]>(project.reminders || []);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadRefreshTrigger, setThreadRefreshTrigger] = useState(0);
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);
  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(
    Boolean(project.guide_content && project.guide_content.trim().length > 0)
  );

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

  // Seamless 1-Click Status Change (Optimistic UI)
  const handleStatusChange = async (nextStatus: ProjectStatusEnum) => {
    if (nextStatus === currentStatus) return;
    setCurrentStatus(nextStatus);

    try {
      const supabase = createClient() as any;
      await supabase
        .from("projects")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", project.id);
    } catch (err) {
      console.error("Failed to update project status:", err);
      setCurrentStatus(project.status);
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

  const wallets = project.wallets || [];
  const rawSocial = (project.social_links as Record<string, any>) || {};
  const telegramPostUrl = rawSocial.telegram_post_url as string | undefined;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Top Navigation & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/projects"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke daftar project</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTelegramModalOpen(true)}
            className="!py-1 !px-2.5 text-caption rounded-md bg-link-teal/15 border border-link-teal/30 text-link-teal hover:bg-link-teal/25 transition-colors font-medium inline-flex items-center gap-1.5 shadow-sm"
            title="Cari update proyek ini di Telegram (Airdrop Finder & Duta Crypto)"
          >
            <Send className="w-3 h-3" />
            <span>Cari Update TG</span>
          </button>

          <ButtonSecondary
            onClick={() => setIsEditProjectModalOpen(true)}
            className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1"
            title="Edit Detail & Tautan Proyek"
          >
            <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
            <span>Edit Info</span>
          </ButtonSecondary>
        </div>
      </div>

      {/* Header Card: Title, Chain, and 1-Click Status Pills */}
      <div className="p-4 rounded-lg bg-bg-elevated border border-border-hairline space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-heading-1 font-bold text-text-primary">
              {project.name}
            </h1>
            <p className="text-caption text-text-secondary font-mono mt-0.5">
              Network/Chain:{" "}
              <span className="text-text-primary font-semibold">
                {project.chain || "Belum ditentukan"}
              </span>
            </p>
          </div>

          {/* 1-Click Status Pills */}
          <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto overflow-hidden">
            <span className="text-[11px] font-medium text-text-tertiary">
              Status Proyek (1-Klik):
            </span>
            <ProjectStatusPills
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
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

      {/* Dual-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Main Execution Hub (65% width) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section 1: Langkah Garapan Utama (Checklist Pengerjaan Awal) */}
          <CardBase className="p-4 space-y-3">
            <InteractiveTaskList
              projectId={project.id}
              initialTasks={tasks}
              onTasksUpdated={() => router.refresh()}
            />
          </CardBase>

          {/* Section 2: Modern Thread & Riwayat Garapan (Telegram & Update Lanjutan) */}
          <CardBase className="p-4 space-y-3">
            <ProjectThreadView
              projectId={project.id}
              projectName={project.name}
              onOpenTelegramSearch={() => setIsTelegramModalOpen(true)}
              refreshTrigger={threadRefreshTrigger}
              onThreadsLoaded={setThreads}
            />
          </CardBase>

          {/* Section 2: Panduan & Catatan Garapan (Collapsible Accordion) */}
          <CardBase className="p-4 space-y-3">
            <div
              onClick={() => setIsGuideExpanded(!isGuideExpanded)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <h2 className="text-body-sm font-semibold text-text-primary">
                  Panduan & Catatan Garapan
                </h2>
              </div>
              <button
                type="button"
                className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                {isGuideExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {isGuideExpanded && (
              <div className="pt-2 border-t border-border-hairline">
                <GuideViewer
                  projectId={project.id}
                  initialContent={project.guide_content}
                  onContentUpdated={() => router.refresh()}
                />
              </div>
            )}
          </CardBase>
        </div>

        {/* RIGHT COLUMN: Utility, Reminders, Wallets & Accounts (35% width) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Widget 1: Pengingat / Alarm Proyek */}
          <CardBase className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-semibold text-text-primary">
                  Pengingat ({reminders.length})
                </h3>
              </div>
              <ButtonSecondary
                onClick={() => {
                  setEditingReminder(null);
                  setIsReminderModalOpen(true);
                }}
                className="!py-0.5 !px-2 text-caption inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Pasang</span>
              </ButtonSecondary>
            </div>

            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map((rem) => {
                  const dateStr = rem.next_trigger_at
                    ? new Date(rem.next_trigger_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Belum diatur";
                  const isPast = rem.next_trigger_at
                    ? new Date(rem.next_trigger_at).getTime() < Date.now()
                    : false;

                  return (
                    <div
                      key={rem.id}
                      className={`p-2.5 rounded-md border text-caption flex items-center justify-between gap-2 ${
                        isPast
                          ? "bg-status-overdue/10 border-status-overdue/30 text-status-overdue"
                          : "bg-bg-elevated-2 border-border-hairline text-text-primary"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                        <span className="text-[10px] text-text-tertiary capitalize">
                          {rem.frequency === "once"
                            ? "Sekali"
                            : rem.frequency === "daily"
                            ? "Harian"
                            : rem.frequency === "weekly"
                            ? "Mingguan"
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
                          className="p-1 text-text-tertiary hover:text-text-primary rounded"
                          title="Ubah pengingat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1 text-text-tertiary hover:text-status-overdue rounded"
                          title="Hapus pengingat"
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
                Belum ada pengingat terjadwal untuk proyek ini.
              </p>
            )}
          </CardBase>

          {/* Widget 2: Wallet Terhubung */}
          <CardBase className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-semibold text-text-primary">
                  Wallet ({wallets.length})
                </h3>
              </div>
              <ButtonSecondary
                onClick={() => setIsWalletModalOpen(true)}
                className="!py-0.5 !px-2 text-caption inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Atur</span>
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
                      className="p-2.5 rounded-md bg-bg-elevated-2 border border-border-hairline flex items-center justify-between gap-2"
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
                        className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                        title="Salin Address"
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
                Belum ada wallet dipasangkan ke proyek ini.
              </p>
            )}
          </CardBase>

          {/* Widget 3: Akun Terkait (Non-sensitif) */}
          <CardBase className="p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-caption text-text-tertiary">
              <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-semibold text-text-primary">Akun Terkait</span>
            </div>
            {project.accounts && project.accounts.length > 0 ? (
              <div className="space-y-1.5">
                {project.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2 rounded bg-bg-elevated-2 text-caption flex items-center justify-between font-mono"
                  >
                    <span className="text-text-tertiary">{acc.label}:</span>
                    <span className="text-text-primary truncate max-w-[160px]">
                      {acc.username_email}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-text-tertiary">
                Belum ada akun/username tersimpan.
              </p>
            )}
          </CardBase>
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
      />
    </div>
  );
}
