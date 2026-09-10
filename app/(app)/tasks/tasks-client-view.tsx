"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import {
  ExternalLink,
  Layers,
  ArrowRight,
  Send,
  Clock,
  Newspaper,
  BookOpen,
  Folder,
  Repeat,
  Zap,
  PauseCircle,
  Gift,
  CheckCircle2,
  Bell,
  Search,
  Check,
  RotateCcw,
  Circle,
  Play,
  Hourglass,
} from "lucide-react";
import { TelegramUpdateModal } from "@/components/features/telegram-update-modal";
import { CustomSelect } from "@/components/ui/select";
import { cleanHtmlEntities } from "@/lib/supabase/thread-updates";
import {
  isProjectDailyDone,
  toggleProjectDailyTask,
  updateProjectTaskType,
  updateProjectLifecycleStatus,
} from "@/lib/supabase/daily-tasks-helper";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

interface TasksClientViewProps {
  initialProjects: ProjectRow[];
  initialTasks?: any[];
  initialUpdates?: any[];
  initialReminders?: any[];
}

// Operational task types for filtering & classification
type OperationalFilter =
  | "all"
  | "daily"
  | "weekly"
  | "one_time"
  | "waiting"
  | "ready_to_claim"
  | "completed";

function getChannelLogo(channelOrUrl?: string | null) {
  const text = (channelOrUrl || "").toLowerCase();
  if (text.includes("dutacrypto")) {
    return {
      name: "Duta Crypto Airdrop",
      handle: "@dutacryptoairdrop",
      logo: "/images/credits/dutacrypto.webp",
    };
  }
  if (text.includes("airdropfind")) {
    return {
      name: "Airdrop Finder",
      handle: "@airdropfind",
      logo: "/images/credits/airdropfinder.webp",
    };
  }
  return {
    name: "Airdrop Channel",
    handle: "@telegram",
    logo: null,
  };
}

function formatTime(isoString?: string | null, isEn = false): string {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return isEn ? "Just now" : "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isEn ? `${diffMin}m ago` : `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isEn ? `${diffHours}h ago` : `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return isEn ? "Yesterday" : "Kemarin";
    if (diffDays < 7) return isEn ? `${diffDays}d ago` : `${diffDays} hari lalu`;
    return new Date(isoString).toLocaleDateString(isEn ? "en-US" : "id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

/**
 * Determine operational category of a project:
 * - "completed": Status project is completed
 * - "ready_to_claim": Status project is ready_to_claim
 * - "waiting": Status project is waiting (closed / waiting for snapshot)
 * - "one_time": social_links.task_type === "one_time"
 * - "weekly": social_links.task_type === "weekly"
 * - "daily": default active check-in routine
 */
function getProjectOperationalType(
  project: ProjectRow
): "ready_to_claim" | "waiting" | "completed" | "one_time" | "weekly" | "daily" {
  if (project.status === "completed") return "completed";
  if (project.status === "ready_to_claim") return "ready_to_claim";
  if (project.status === "waiting") return "waiting";
  const rawSocial = (project.social_links as Record<string, any>) || {};
  if (rawSocial.task_type === "one_time") return "one_time";
  if (rawSocial.task_type === "weekly") return "weekly";
  return "daily";
}

export function TasksClientView({
  initialProjects,
  initialTasks = [],
  initialUpdates = [],
  initialReminders = [],
}: TasksClientViewProps) {
  const { t, isEn } = useTranslation();
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [updates, setUpdates] = useState<any[]>(initialUpdates);
  const [reminders, setReminders] = useState<any[]>(initialReminders);

  const [activeTab, setActiveTab] = useState<OperationalFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [telegramModalProject, setTelegramModalProject] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [editingClaimProjectId, setEditingClaimProjectId] = useState<string | null>(null);
  const [claimInputUrl, setClaimInputUrl] = useState<string>("");

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Counts for each operational category
  const stats = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let oneTime = 0;
    let waiting = 0;
    let readyToClaim = 0;
    let completed = 0;

    projects.forEach((p) => {
      const type = getProjectOperationalType(p);
      if (type === "daily") daily++;
      else if (type === "weekly") weekly++;
      else if (type === "one_time") oneTime++;
      else if (type === "waiting") waiting++;
      else if (type === "ready_to_claim") readyToClaim++;
      else if (type === "completed") completed++;
    });

    return {
      total: projects.length,
      daily,
      weekly,
      oneTime,
      waiting,
      readyToClaim,
      completed,
    };
  }, [projects]);

  // Filter projects by operational tab and search query
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const opType = getProjectOperationalType(project);

      // Tab filter
      if (activeTab !== "all" && opType !== activeTab) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = project.name.toLowerCase().includes(q);
        const matchChain = (project.chain || "").toLowerCase().includes(q);
        if (!matchName && !matchChain) return false;
      }

      return true;
    });
  }, [projects, activeTab, searchQuery]);

  // Toggle Daily Completion (Reset 07:00 WIB)
  const handleToggleDaily = async (project: ProjectRow) => {
    const isDone = isProjectDailyDone(project, tasks.filter((t) => t.project_id === project.id));
    const targetStatus = !isDone;
    const nowIso = targetStatus ? new Date().toISOString() : null;

    setUpdatingTaskId(project.id);

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== project.id) return p;
        const currentSocial = (p.social_links as Record<string, any>) || {};
        const updatedSocial = { ...currentSocial };
        if (targetStatus) {
          updatedSocial.last_daily_completed_at = nowIso;
        } else {
          delete updatedSocial.last_daily_completed_at;
        }
        return {
          ...p,
          social_links: updatedSocial,
        };
      })
    );

    // Optimistic UI update for tasks
    setTasks((prev) =>
      prev.map((t) =>
        t.project_id === project.id
          ? {
              ...t,
              status: targetStatus ? "done" : "pending",
              completed_at: nowIso,
              updated_at: nowIso || new Date().toISOString(),
            }
          : t
      )
    );

    // Synchronize to DB
    const res = await toggleProjectDailyTask(project.id, targetStatus);
    setUpdatingTaskId(null);

    if (!res.success) {
      // Revert if error
      setProjects(initialProjects);
      setTasks(initialTasks);
    }
  };

  // Change Project Lifecycle Status (Optimistic + Supabase)
  const handleChangeStatus = async (
    project: ProjectRow,
    nextStatus: Database["public"]["Enums"]["project_status"],
    claimUrlParam?: string
  ) => {
    setUpdatingTaskId(project.id);

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== project.id) return p;
        const currentSocial = (p.social_links as Record<string, any>) || {};
        const updatedSocial = { ...currentSocial };
        if (claimUrlParam !== undefined) {
          if (claimUrlParam) updatedSocial.claim_url = claimUrlParam;
          else delete updatedSocial.claim_url;
        }
        return {
          ...p,
          status: nextStatus,
          social_links: updatedSocial,
        };
      })
    );

    const res = await updateProjectLifecycleStatus(project.id, nextStatus, claimUrlParam);
    setUpdatingTaskId(null);

    if (!res.success) {
      setProjects(initialProjects);
    }
  };

  // Switch Task Routine Type ("daily" | "weekly" | "one_time")
  const handleSwitchRoutine = async (
    project: ProjectRow,
    newType: "daily" | "weekly" | "one_time"
  ) => {
    setUpdatingTaskId(project.id);

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== project.id) return p;
        const currentSocial = (p.social_links as Record<string, any>) || {};
        return {
          ...p,
          social_links: {
            ...currentSocial,
            task_type: newType,
          },
        };
      })
    );

    const res = await updateProjectTaskType(project.id, newType);
    setUpdatingTaskId(null);

    if (!res.success) {
      setProjects(initialProjects);
    }
  };

  const handleSaveClaimUrl = async (project: ProjectRow) => {
    if (!claimInputUrl.trim()) return;
    await handleChangeStatus(project, "ready_to_claim", claimInputUrl.trim());
    setEditingClaimProjectId(null);
    setClaimInputUrl("");
  };

  return (
    <div className="w-full space-y-6 min-w-0 pb-16 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-heading-2 font-bold text-text-primary tracking-tight">
              {t("tasks.title")}
            </h1>
          </div>
          <p className="text-body-sm text-text-secondary mt-1 max-w-2xl">
            {t("tasks.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-white/[0.04] text-text-primary hover:bg-white/[0.08] border border-white/[0.1] text-caption font-semibold transition-all inline-flex items-center gap-2"
          >
            <Folder className="w-3.5 h-3.5 text-accent" />
            <span>{t("tasks.manageFolders")}</span>
          </Link>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-white/[0.06]">
        {/* Operational Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {/* Semua */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-white/[0.1] text-text-primary border border-white/[0.2] shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <span>{t("tasks.tabs.all")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono leading-none">
              {stats.total}
            </span>
          </button>

          {/* Check-in Harian */}
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "daily"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("tasks.tabs.daily")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-[10px] font-mono leading-none">
              {stats.daily}
            </span>
          </button>

          {/* Mingguan */}
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "weekly"
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-sky-400" />
            <span>{t("tasks.tabs.weekly")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500/15 text-[10px] font-mono leading-none">
              {stats.weekly}
            </span>
          </button>

          {/* Sekali Selesai */}
          <button
            type="button"
            onClick={() => setActiveTab("one_time")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "one_time"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t("tasks.tabs.oneTime")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-[10px] font-mono leading-none">
              {stats.oneTime}
            </span>
          </button>

          {/* Menunggu Snapshot */}
          <button
            type="button"
            onClick={() => setActiveTab("waiting")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "waiting"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5 text-purple-300" />
            <span>{t("tasks.tabs.waiting")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/15 text-[10px] font-mono leading-none">
              {stats.waiting}
            </span>
          </button>

          {/* Siap Klaim */}
          <button
            type="button"
            onClick={() => setActiveTab("ready_to_claim")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "ready_to_claim"
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-300" />
            <span>{t("tasks.tabs.readyToClaim")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-[10px] font-mono leading-none">
              {stats.readyToClaim}
            </span>
          </button>

          {/* Selesai Diklaim */}
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-status-completed/20 text-status-completed border border-status-completed/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-status-completed" />
            <span>{t("tasks.tabs.completed")}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-status-completed/15 text-[10px] font-mono leading-none">
              {stats.completed}
            </span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 shrink-0 max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tasks.searchPlaceholder")}
            className="bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[11px] text-text-tertiary hover:text-text-primary px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* PROJECT CARDS STREAM */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-dashed border-white/[0.1] text-center space-y-3 shadow-xl shadow-black/20">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto border border-accent/25">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-body-md font-semibold text-text-primary">
            {t("tasks.card.emptyCategory")}
          </h3>
          <p className="text-caption text-text-secondary max-w-md mx-auto">
            {searchQuery
              ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba kata kunci lain.`
              : "Semua status garapan akan muncul di sini sesuai klasifikasinya."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const rawSocial = (project.social_links as Record<string, any>) || {};
            const dappUrl = rawSocial.dapp_url || rawSocial.website;
            const claimUrl = rawSocial.claim_url;
            const badgeStatus = project.status as ProjectStatus;
            const channelSource = getChannelLogo(rawSocial.telegram_post_url || rawSocial.channel);
            const projectUpdates = updates.filter((u) => u.project_id === project.id);
            const projectReminders = reminders.filter((r) => r.project_id === project.id && r.is_active);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);

            const opType = getProjectOperationalType(project);
            const isDailyDone = isProjectDailyDone(project, projectTasks);
            const isUpdating = updatingTaskId === project.id;
            const isEditingClaimUrl = editingClaimProjectId === project.id;

            // Clean guide snippet
            let cleanSnippet = (project.guide_content || "").trim();
            if (cleanSnippet.startsWith("📋 POSTINGAN ASLI SUMBER:")) {
              cleanSnippet = cleanSnippet.replace("📋 POSTINGAN ASLI SUMBER:", "").trim();
            }
            if (cleanSnippet.startsWith("---")) {
              cleanSnippet = cleanSnippet.replace(/^---+\s*/, "").trim();
            }
            const snippetLines = cleanSnippet.split("\n").filter((l) => l.trim()).slice(0, 3).join("\n");

            return (
              <div
                key={project.id}
                className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] transition-all shadow-xl shadow-black/20 space-y-4"
              >
                {/* Top Bar: Channel & Project Identification */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-white/[0.05] shrink-0 flex items-center justify-center shadow-md">
                      {channelSource.logo ? (
                        <Image
                          src={channelSource.logo}
                          alt={channelSource.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Send className="w-4 h-4 text-accent" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/projects/${project.id}`}
                          prefetch={false}
                          className="text-body-md font-bold text-text-primary hover:text-accent transition-colors truncate"
                        >
                          {project.name}
                        </Link>
                        {project.chain && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-text-secondary">
                            {project.chain}
                          </span>
                        )}
                        <StatusBadge status={badgeStatus} />
                      </div>
                      <p className="text-[11px] text-text-tertiary font-mono">
                        {channelSource.name} • Didaftarkan {formatTime(project.created_at, isEn)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    {/* Direct Claim link if ready_to_claim */}
                    {claimUrl && (
                      <a
                        href={claimUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all text-caption font-bold shadow-sm"
                        title={isEn ? "Open official claim portal" : "Buka portal klaim token resmi"}
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>{t("tasks.card.claimReward")}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {dappUrl && !claimUrl && (
                      <a
                        href={dappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-accent hover:bg-accent/15 hover:border-accent/30 border border-white/[0.08] transition-all text-caption font-semibold"
                        title="Buka Website / DApp Resmi"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t("tasks.card.openDapp")}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setTelegramModalProject(project.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-link-teal hover:bg-link-teal/15 hover:border-link-teal/30 border border-white/[0.08] transition-all text-caption font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t("tasks.card.checkTG")}</span>
                    </button>

                    <Link
                      href={`/projects/${project.id}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-md shadow-accent/20"
                    >
                      <span>{t("tasks.card.timeline")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* OPERATIONAL STATUS BANNER & SCHEDULE CONTROLS */}
                <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.05] space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {opType === "daily" && (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {opType === "weekly" && (
                        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Repeat className="w-4 h-4" />
                        </div>
                      )}
                      {opType === "one_time" && (
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-4 h-4" />
                        </div>
                      )}
                      {opType === "waiting" && (
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          <PauseCircle className="w-4 h-4" />
                        </div>
                      )}
                      {opType === "ready_to_claim" && (
                        <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Gift className="w-4 h-4" />
                        </div>
                      )}
                      {opType === "completed" && (
                        <div className="w-9 h-9 rounded-xl bg-status-completed/15 border border-status-completed/30 text-status-completed flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body-sm font-bold text-text-primary">
                            {opType === "daily" && t("tasks.card.dailyTitle")}
                            {opType === "weekly" && t("tasks.card.weeklyTitle")}
                            {opType === "one_time" && t("tasks.card.oneTimeTitle")}
                            {opType === "waiting" && t("tasks.card.waitingTitle")}
                            {opType === "ready_to_claim" && t("tasks.card.readyToClaimTitle")}
                            {opType === "completed" && t("tasks.card.completedTitle")}
                          </span>

                          {/* Routine Toggles for active projects */}
                          {(opType === "daily" || opType === "weekly" || opType === "one_time") && (
                            <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSwitchRoutine(project, "daily")}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                  opType === "daily"
                                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                {isEn ? "Daily" : "Harian"}
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSwitchRoutine(project, "weekly")}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                  opType === "weekly"
                                    ? "bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-xs"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                {isEn ? "Weekly" : "Mingguan"}
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSwitchRoutine(project, "one_time")}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                  opType === "one_time"
                                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-xs"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                {isEn ? "1x Done" : "1x Selesai"}
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-caption text-text-secondary leading-snug">
                          {opType === "daily" &&
                            (isEn
                              ? "Requires regular streak check-in, daily faucet, or point claiming (Resets 07:00 WIB)."
                              : "Membutuhkan check-in streak, faucet, atau klaim point harian (Reset jam 07:00 WIB).")}
                          {opType === "weekly" &&
                            (isEn
                              ? "Periodic transactions (swap/bridge 1-2x per week) to maintain active wallet score."
                              : "Transaksi berkala (swap/bridge 1-2x seminggu) untuk menjaga keaktifan dan volume dompet.")}
                          {opType === "one_time" &&
                            (isEn
                              ? "Completed once (e.g. fill waitlist, bind Discord/Twitter, mint OAT). Set & forget."
                              : "Cukup dikerjakan 1x (misal isi waitlist, bind Discord/Twitter, mint role). Set & forget.")}
                          {opType === "waiting" &&
                            (isEn
                              ? "Testnet/farming phase has ended or snapshot taken — no need to spend gas or tx time!"
                              : "Fase testnet telah berakhir atau sudah snapshot — STOP buang gas fee atau waktu transaksi!")}
                          {opType === "ready_to_claim" &&
                            (isEn
                              ? "Token allocation is live! Visit the claim portal below to withdraw your tokens."
                              : "Alokasi token telah diumumkan! Kunjungi portal klaim untuk menarik reward airdrop kamu.")}
                          {opType === "completed" &&
                            (isEn
                              ? "Airdrop successfully claimed and rewards landed in your wallet. Great job!"
                              : "Airdrop telah selesai dan reward sukses diklaim ke dompet Anda.")}
                        </p>
                      </div>
                    </div>

                    {/* Operational Action Controls on Right */}
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
                      {/* 1-Click Status Dropdown Selector */}
                      <div className="min-w-[150px]">
                        <CustomSelect
                          value={project.status}
                          disabled={isUpdating}
                          onChange={(newStat) => handleChangeStatus(project, newStat as any)}
                          options={[
                            { value: "not_started", label: isEn ? "Not Started" : "Belum Mulai", icon: <PauseCircle className="w-3.5 h-3.5 text-text-tertiary" /> },
                            { value: "in_progress", label: isEn ? "In Progress" : "Sedang Dikerjakan", icon: <Play className="w-3.5 h-3.5 text-status-in-progress" /> },
                            { value: "waiting", label: isEn ? "Waiting Snapshot" : "Menunggu Snapshot", icon: <Hourglass className="w-3.5 h-3.5 text-purple-400" /> },
                            { value: "ready_to_claim", label: isEn ? "Ready to Claim" : "Siap Klaim Reward", icon: <Gift className="w-3.5 h-3.5 text-amber-400" /> },
                            { value: "completed", label: isEn ? "Completed" : "Selesai Diklaim", icon: <CheckCircle2 className="w-3.5 h-3.5 text-status-completed" /> },
                          ]}
                        />
                      </div>

                      {/* Daily Done Button */}
                      {opType === "daily" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleDaily(project)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-semibold transition-all border ${
                            isDailyDone
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-white/[0.04] text-text-primary border-white/[0.1] hover:bg-white/[0.08]"
                          }`}
                        >
                          {isDailyDone ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t("tasks.card.doneToday")}</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-text-tertiary" />
                              <span>{t("tasks.card.markDoneToday")}</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Ready to Claim: Mark as Claimed Button */}
                      {opType === "ready_to_claim" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(project, "completed")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all text-caption font-semibold"
                          title={isEn ? "Mark as successfully claimed" : "Tandai reward sudah selesai diklaim"}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isEn ? "Mark Claimed" : "Tandai Sudah Diklaim"}</span>
                        </button>
                      )}

                      {/* Waiting: Quick Bump to Ready to Claim */}
                      {opType === "waiting" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(project, "ready_to_claim")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 transition-all text-caption font-semibold"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>{isEn ? "Allocation Live" : "Siap Klaim"}</span>
                        </button>
                      )}

                      {/* Completed: Reopen Button */}
                      {opType === "completed" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(project, "in_progress")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] text-[11px] transition-all font-mono"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isEn ? "Reopen" : "Buka Kembali"}</span>
                        </button>
                      )}

                      {projectReminders.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-text-secondary font-mono">
                          <Bell className="w-3 h-3 text-accent" />
                          <span>{t("tasks.card.reminderActive")}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Claim URL Form (if ready_to_claim without URL or user clicks to edit) */}
                  {opType === "ready_to_claim" && (
                    <div className="pt-2 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-caption">
                      {isEditingClaimUrl ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="url"
                            value={claimInputUrl}
                            onChange={(e) => setClaimInputUrl(e.target.value)}
                            placeholder="https://claim.project.xyz atau https://airdrop.project.xyz/check"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-caption font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveClaimUrl(project)}
                            className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-caption font-bold shadow-xs"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClaimProjectId(null);
                              setClaimInputUrl("");
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-caption text-text-tertiary hover:text-text-primary"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 text-[11px] text-text-tertiary font-mono truncate">
                            <span className="text-amber-400 font-bold">Portal Klaim:</span>
                            <span className="truncate text-text-secondary">
                              {claimUrl || (isEn ? "No claim link attached yet." : "Belum ada link klaim terpasang.")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClaimProjectId(project.id);
                              setClaimInputUrl(claimUrl || "");
                            }}
                            className="text-[11px] font-mono text-link-teal hover:underline shrink-0"
                          >
                            {claimUrl ? (isEn ? "Edit Link" : "Ubah Link") : (isEn ? "+ Attach Claim Link" : "+ Pasang Link Klaim")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* POST CONTENT SNIPPET (Clean Natural Text) */}
                {snippetLines ? (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-body-sm text-text-secondary leading-relaxed line-clamp-3 whitespace-pre-line font-sans">
                    {snippetLines}
                  </div>
                ) : (
                  <p className="text-caption text-text-tertiary italic">
                    {isEn ? "No guide or special notes saved yet." : "Belum ada panduan atau catatan khusus tersimpan."}
                  </p>
                )}

                {/* LATEST TELEGRAM UPDATE IF ANY */}
                {projectUpdates.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2 text-caption">
                    <span className="text-text-tertiary flex items-center gap-1.5 font-mono text-[11px] truncate">
                      <Newspaper className="w-3 h-3 text-link-teal shrink-0" />
                      <span className="truncate">
                        {isEn ? "Latest Update: " : "Update Terkini: "}{cleanHtmlEntities(projectUpdates[0].title).slice(0, 70)}...
                      </span>
                    </span>
                    <span className="text-text-tertiary text-[11px] font-mono shrink-0">
                      {formatTime(projectUpdates[0].created_at, isEn)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL SEARCH UPDATE TELEGRAM */}
      {telegramModalProject && (
        <TelegramUpdateModal
          isOpen={true}
          onClose={() => setTelegramModalProject(null)}
          projectName={telegramModalProject}
        />
      )}
    </div>
  );
}
