"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import {
  ExternalLink,
  Layers,
  ArrowRight,
  Filter,
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
  Calendar,
  Bell,
  Search,
  Check,
  RotateCcw,
  Circle,
} from "lucide-react";
import { TelegramUpdateModal } from "@/components/features/telegram-update-modal";
import { cleanHtmlEntities } from "@/lib/supabase/thread-updates";
import {
  isProjectDailyDone,
  toggleProjectDailyTask,
  updateProjectTaskType,
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
type OperationalFilter = "all" | "recurring" | "one_time" | "waiting" | "ready_to_claim";

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
 * - "ready_to_claim": Status project is ready_to_claim
 * - "waiting": Status project is waiting (closed / waiting for snapshot)
 * - "one_time": social_links.task_type === "one_time"
 * - "recurring": Default for active airdrops, or social_links.task_type === "recurring"
 */
function getProjectOperationalType(project: ProjectRow): "ready_to_claim" | "waiting" | "one_time" | "recurring" {
  if (project.status === "ready_to_claim") return "ready_to_claim";
  if (project.status === "waiting") return "waiting";
  const rawSocial = (project.social_links as Record<string, any>) || {};
  if (rawSocial.task_type === "one_time") return "one_time";
  return "recurring";
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
    let recurring = 0;
    let oneTime = 0;
    let waiting = 0;
    let readyToClaim = 0;

    projects.forEach((p) => {
      const type = getProjectOperationalType(p);
      if (type === "recurring") recurring++;
      else if (type === "one_time") oneTime++;
      else if (type === "waiting") waiting++;
      else if (type === "ready_to_claim") readyToClaim++;
    });

    return {
      total: projects.length,
      recurring,
      oneTime,
      waiting,
      readyToClaim,
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

    // Synchronize to DB
    const res = await toggleProjectDailyTask(project.id, targetStatus);
    setUpdatingTaskId(null);

    if (!res.success) {
      // Revert if error
      setProjects(initialProjects);
    }
  };

  // Switch Task Type ("recurring" <-> "one_time")
  const handleSwitchTaskType = async (project: ProjectRow, newType: "recurring" | "one_time") => {
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
            <span className="px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[10px] font-mono">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("recurring")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "recurring"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("tasks.tabs.recurring")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-[10px] font-mono">
              {stats.recurring}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("one_time")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "one_time"
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>{t("tasks.tabs.oneTime")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/15 text-[10px] font-mono">
              {stats.oneTime}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("waiting")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "waiting"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t("tasks.tabs.waiting")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-[10px] font-mono">
              {stats.waiting}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ready_to_claim")}
            className={`px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "ready_to_claim"
                ? "bg-status-completed/20 text-status-completed border border-status-completed/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-status-completed" />
            <span>{t("tasks.tabs.readyToClaim")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-status-completed/15 text-[10px] font-mono">
              {stats.readyToClaim}
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
            const badgeStatus = project.status.replace("_", "-") as ProjectStatus;
            const channelSource = getChannelLogo(rawSocial.telegram_post_url || rawSocial.channel);
            const projectUpdates = updates.filter((u) => u.project_id === project.id);
            const projectReminders = reminders.filter((r) => r.project_id === project.id && r.is_active);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);

            const opType = getProjectOperationalType(project);
            const isDailyDone = isProjectDailyDone(project, projectTasks);
            const isUpdating = updatingTaskId === project.id;

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
                        {channelSource.name} • Didaftarkan {formatTime(project.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    {dappUrl && (
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

                {/* OPERATIONAL STATUS BANNER & SCHEDULE INFO */}
                <div className="rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {opType === "recurring" && (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                        <Repeat className="w-4 h-4" />
                      </div>
                    )}
                    {opType === "one_time" && (
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                    )}
                    {opType === "waiting" && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                        <PauseCircle className="w-4 h-4" />
                      </div>
                    )}
                    {opType === "ready_to_claim" && (
                      <div className="w-8 h-8 rounded-lg bg-status-completed/15 border border-status-completed/30 text-status-completed flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-text-primary">
                          {opType === "recurring" && (isEn ? "Recurring Tasks (Daily/Periodic)" : "Tugas Rutin Berulang (Daily/Periodic)")}
                          {opType === "one_time" && (isEn ? "One-Time Task (Set & Forget)" : "Tugas Sekali Selesai (Set & Forget)")}
                          {opType === "waiting" && (isEn ? "Airdrop Ended / Waiting Snapshot" : "Garapan Ditutup / Menunggu Snapshot")}
                          {opType === "ready_to_claim" && (isEn ? "Ready to Claim Reward" : "Siap Klaim Reward")}
                        </span>

                        {/* Switch type button for active projects */}
                        {(opType === "recurring" || opType === "one_time") && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleSwitchTaskType(
                                project,
                                opType === "recurring" ? "one_time" : "recurring"
                              )
                            }
                            className="text-[10px] font-mono text-text-tertiary hover:text-accent underline transition-colors"
                            title={isEn ? "Change operational type for this project" : "Ubah tipe operasional garapan ini"}
                          >
                            {opType === "recurring"
                              ? (isEn ? "Switch to One-Time" : "Ubah ke Sekali Selesai")
                              : (isEn ? "Switch to Recurring" : "Ubah ke Rutin Berulang")}
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-text-secondary">
                        {opType === "recurring" &&
                          (isEn
                            ? "Requires periodic transactions, faucet, or daily check-in (Reset 07:00 WIB)."
                            : "Membutuhkan transaksi berkala, faucet, atau check-in harian (Reset 07:00 WIB).")}
                        {opType === "one_time" &&
                          (isEn
                            ? "Completed once (e.g. fill waitlist form, claim OAT/Discord role)."
                            : "Cukup dikerjakan 1x (misal isi form waitlist, klaim OAT/role Discord).")}
                        {opType === "waiting" &&
                          (isEn
                            ? "⛔ Testnet phase has ended — no need to spend further gas or transaction time."
                            : "⛔ Fase testnet telah berakhir — Anda tidak perlu buang gas/waktu transaksi lagi.")}
                        {opType === "ready_to_claim" &&
                          (isEn
                            ? "🎉 Token allocation announced! Visit the claim portal to withdraw your reward."
                            : "🎉 Alokasi token telah diumumkan! Kunjungi portal klaim untuk menarik reward Anda.")}
                      </p>
                    </div>
                  </div>

                  {/* Operational Action / Indicator Right */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {opType === "recurring" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleDaily(project)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold transition-all border ${
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

                    {projectReminders.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-text-secondary font-mono">
                        <Bell className="w-3 h-3 text-accent" />
                        <span>{t("tasks.card.reminderActive")}</span>
                      </span>
                    )}
                  </div>
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
