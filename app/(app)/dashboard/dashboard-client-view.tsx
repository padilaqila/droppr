"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardDashboardStat, CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import {
  FolderGit2,
  CheckSquare,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Bell,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Check,
} from "lucide-react";
import { SetReminderModal } from "@/components/features/set-reminder-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  formatReminderSchedule,
  isReminderActiveToday,
} from "@/lib/supabase/reminders-helper";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

export interface EnrichedReminder extends ReminderRow {
  projects?: { id: string; name: string; chain: string | null } | null;
  tasks?: { id: string; title: string } | null;
}

interface DashboardClientViewProps {
  initialProjects: ProjectRow[];
  initialTasks: TaskRow[];
  initialReminders: EnrichedReminder[];
}

/**
 * Extracts external URL from task string for dedicated click button
 */
function extractFirstUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
}

function cleanTaskTitle(text: string): string {
  return text.replace(/(https?:\/\/[^\s]+)/g, "").trim();
}

export function DashboardClientView({
  initialProjects,
  initialTasks,
  initialReminders,
}: DashboardClientViewProps) {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [reminders, setReminders] = useState<EnrichedReminder[]>(initialReminders);

  // Filter state for today's project cards
  const [activeProjectFilter, setActiveProjectFilter] = useState<
    "today_and_active" | "all" | "completed"
  >("today_and_active");

  // Track expanded cards (default all open)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Modal states
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedReminderProjectId, setSelectedReminderProjectId] = useState<string>("");
  const [editingReminder, setEditingReminder] = useState<ReminderRow | null>(null);

  // Sync state when server re-renders after router.refresh() (per MEMORY.md)
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Toggle card expansion
  const toggleExpand = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === undefined ? false : !prev[projectId],
    }));
  };

  const isProjectExpanded = (projectId: string) => {
    return expandedProjects[projectId] !== false; // Default true
  };

  // Safe task checkbox toggle with optimistic update & feedback
  const handleToggleTask = async (
    e: React.MouseEvent,
    taskId: string,
    currentStatus: string
  ) => {
    e.stopPropagation(); // Stop click from triggering parent card elements

    const nextStatus = currentStatus === "done" ? "pending" : "done";
    const nowIso = nextStatus === "done" ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: nextStatus, completed_at: nowIso } : t
      )
    );

    try {
      const supabase = createClient() as any;
      await supabase
        .from("tasks")
        .update({
          status: nextStatus,
          completed_at: nowIso,
        })
        .eq("id", taskId);
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: currentStatus as any } : t
        )
      );
    }
  };

  // Quick Open Modal for a specific project
  const handleOpenReminderForProject = (projectId: string) => {
    setSelectedReminderProjectId(projectId);
    const existing = reminders.find((r) => r.project_id === projectId);
    setEditingReminder(existing || null);
    setIsReminderModalOpen(true);
  };

  // Map reminders to project ID for instant O(1) lookup
  const remindersByProjectId = React.useMemo(() => {
    const map = new Map<string, EnrichedReminder>();
    reminders.forEach((r) => {
      if (r.project_id) {
        map.set(r.project_id, r);
      }
    });
    return map;
  }, [reminders]);

  // Derived Project Stats
  const totalProjectsCount = projects.length;
  const readyClaimCount = projects.filter((p) => p.status === "ready_to_claim").length;

  // Identify projects with reminders scheduled for today
  const projectsWithTodayReminders = React.useMemo(() => {
    return projects.filter((p) => {
      const reminder = remindersByProjectId.get(p.id);
      return reminder ? isReminderActiveToday(reminder.frequency) : false;
    });
  }, [projects, remindersByProjectId]);

  // Task Statistics
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "done").length;
  const overallTaskProgress =
    totalTasksCount > 0
      ? Math.round((completedTasksCount / totalTasksCount) * 100)
      : 0;

  // Filter Projects for the main list
  const displayedProjects = React.useMemo(() => {
    if (activeProjectFilter === "all") {
      return projects;
    }

    if (activeProjectFilter === "completed") {
      return projects.filter((p) => {
        const pTasks = tasks.filter((t) => t.project_id === p.id);
        return pTasks.length > 0 && pTasks.every((t) => t.status === "done");
      });
    }

    // Default: "today_and_active"
    // Shows projects scheduled for today OR active projects that have pending tasks
    return projects.filter((p) => {
      const reminder = remindersByProjectId.get(p.id);
      const isTodayReminder = reminder
        ? isReminderActiveToday(reminder.frequency)
        : false;

      const pTasks = tasks.filter((t) => t.project_id === p.id);
      const hasPendingTasks = pTasks.some((t) => t.status !== "done");

      // Prioritize: scheduled today or in_progress with pending tasks
      return isTodayReminder || (p.status === "in_progress" && hasPendingTasks) || pTasks.length === 0;
    });
  }, [projects, tasks, remindersByProjectId, activeProjectFilter]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Command Center Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary">
            Command Center
          </h1>
          <p className="text-body-sm text-text-secondary">
            Pantau dan garap tugas airdrop hari ini dengan checklist berbasis proyek dan jadwal pengingat aktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonSecondary
            onClick={() => {
              setSelectedReminderProjectId("");
              setEditingReminder(null);
              setIsReminderModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
          >
            <Bell className="w-4 h-4 text-accent" />
            <span>Pasang Pengingat</span>
          </ButtonSecondary>

          <Link href="/projects" prefetch={false}>
            <ButtonPrimary className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm">
              <Plus className="w-4 h-4 text-on-accent" />
              <span>Tambah Proyek</span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">Jadwal Hari Ini</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {projectsWithTodayReminders.length}{" "}
            <span className="text-caption font-normal text-text-tertiary">
              proyek
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5 font-mono">
            Alarm default 07:00 WIB
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">Progress Tugas</span>
            <CheckSquare className="w-4 h-4 text-status-completed" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {completedTasksCount}{" "}
            <span className="text-caption font-normal text-text-tertiary">
              / {totalTasksCount}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {overallTaskProgress}% selesai secara keseluruhan
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">Siap Klaim Reward</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-accent">
            {readyClaimCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {readyClaimCount > 0 ? "Fase klaim reward aktif!" : "Menunggu snapshot"}
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">Total Proyek</span>
            <FolderGit2 className="w-4 h-4 text-status-in-progress" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {totalProjectsCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {reminders.length} proyek dengan pengingat
          </div>
        </CardDashboardStat>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Project-Based Workstation Cards (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-accent shrink-0" />
              <h2 className="text-body-md font-bold text-text-primary">
                Tugas Garapan Berbasis Proyek
              </h2>
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex items-center gap-1 bg-bg-elevated p-1 rounded-lg border border-border-hairline self-start max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveProjectFilter("today_and_active")}
                className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors shrink-0 ${
                  activeProjectFilter === "today_and_active"
                    ? "bg-accent text-on-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Hari Ini & Aktif
              </button>
              <button
                type="button"
                onClick={() => setActiveProjectFilter("all")}
                className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors shrink-0 ${
                  activeProjectFilter === "all"
                    ? "bg-accent text-on-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Semua Proyek ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveProjectFilter("completed")}
                className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors shrink-0 ${
                  activeProjectFilter === "completed"
                    ? "bg-status-completed text-white font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Project Cards List */}
          {displayedProjects.length === 0 ? (
            <CardBase className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-status-completed mx-auto" />
              <h3 className="text-heading-3 font-semibold text-text-primary">
                {activeProjectFilter === "completed"
                  ? "Belum ada proyek yang semua tugasnya tuntas"
                  : "Semua tugas garapan hari ini telah selesai!"}
              </h3>
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
                Bagus sekali! Semua langkah pengerjaan untuk proyek aktif hari ini sudah kamu selesaikan dengan baik.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveProjectFilter("all")}
                  className="px-3 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-primary text-caption font-medium hover:border-border-hairline-strong transition-colors"
                >
                  Tampilkan Semua Proyek
                </button>
              </div>
            </CardBase>
          ) : (
            <div className="space-y-3.5">
              {displayedProjects.map((proj) => {
                const rawSocial = (proj.social_links as Record<string, any>) || {};
                const dappUrl = rawSocial.dapp_url || rawSocial.website;
                const faucetUrl = rawSocial.faucet_url;

                const pTasks = tasks.filter((t) => t.project_id === proj.id);
                const doneCount = pTasks.filter((t) => t.status === "done").length;
                const totalPTasks = pTasks.length;
                const projectProgress =
                  totalPTasks > 0 ? Math.round((doneCount / totalPTasks) * 100) : 0;
                const isAllDone = totalPTasks > 0 && doneCount === totalPTasks;

                const projectReminder = remindersByProjectId.get(proj.id);
                const isTodayReminder = projectReminder
                  ? isReminderActiveToday(projectReminder.frequency)
                  : false;
                const scheduleLabel = projectReminder
                  ? formatReminderSchedule(projectReminder.frequency)
                  : null;

                const isExpanded = isProjectExpanded(proj.id);

                return (
                  <div
                    key={proj.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isAllDone
                        ? "bg-bg-elevated/70 border-status-completed/30"
                        : isTodayReminder
                        ? "bg-bg-elevated border-accent/40 shadow-sm"
                        : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong"
                    }`}
                  >
                    {/* Card Header (Click to expand/collapse) */}
                    <div
                      onClick={() => toggleExpand(proj.id)}
                      className="p-4 cursor-pointer select-none space-y-3 transition-colors hover:bg-bg-elevated-2/50"
                    >
                      {/* Top Row: Project Name, Badges & Direct Launch Links */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/projects/${proj.id}`}
                              prefetch={false}
                              onClick={(e) => e.stopPropagation()}
                              className="text-body-md font-bold text-text-primary hover:text-accent transition-colors truncate"
                              title="Buka detail proyek"
                            >
                              {proj.name}
                            </Link>

                            {proj.chain && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                                {proj.chain}
                              </span>
                            )}

                            <StatusBadge
                              status={proj.status.replace("_", "-") as ProjectStatus}
                            />

                            {isTodayReminder && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold border border-accent/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Jadwal Hari Ini</span>
                              </span>
                            )}

                            {isAllDone && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-completed/15 text-status-completed font-semibold border border-status-completed/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Tuntas Hari Ini</span>
                              </span>
                            )}
                          </div>

                          {/* Reminder Schedule Caption */}
                          {scheduleLabel ? (
                            <div className="flex items-center gap-1.5 text-caption text-accent font-medium pt-0.5">
                              <Bell className="w-3.5 h-3.5" />
                              <span>Pengingat: {scheduleLabel}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReminderForProject(proj.id);
                              }}
                              className="text-[11px] text-text-tertiary hover:text-accent flex items-center gap-1 pt-0.5 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Atur jam pengingat</span>
                            </button>
                          )}
                        </div>

                        {/* Direct Action Launch Buttons (Isolated from card expand) */}
                        <div
                          className="flex items-center gap-1.5 shrink-0 self-end sm:self-start flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dappUrl && (
                            <a
                              href={dappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-caption font-semibold"
                              title="Buka Web App DApp Proyek Langsung"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Buka DApp</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {faucetUrl && (
                            <a
                              href={faucetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-bg-elevated-2 border border-border-hairline text-accent hover:border-accent transition-colors text-[11px] font-medium"
                              title="Buka Faucet Testnet"
                            >
                              <span>Faucet</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          <Link
                            href={`/projects/${proj.id}`}
                            prefetch={false}
                            className="p-1.5 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-elevated-2 transition-colors"
                            title="Workstation Detail"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>

                          {/* Expand/Collapse Chevron Icon */}
                          <div className="p-1 text-text-tertiary">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Animated Progress Bar Row */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-caption font-mono">
                          <span className="text-text-secondary font-medium">
                            {totalPTasks > 0
                              ? `${doneCount} dari ${totalPTasks} tugas diselesaikan`
                              : "Belum ada checklist tugas"}
                          </span>
                          <span
                            className={`font-bold transition-colors ${
                              isAllDone ? "text-status-completed" : "text-accent"
                            }`}
                          >
                            {projectProgress}%
                          </span>
                        </div>

                        {/* Smooth Animated Progress Bar */}
                        <div className="h-2 rounded-full bg-bg-elevated-2 overflow-hidden border border-border-hairline">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${
                              isAllDone
                                ? "bg-status-completed"
                                : "bg-accent"
                            }`}
                            style={{ width: `${projectProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Task Checklist (Protected against accidental clicks) */}
                    {isExpanded && (
                      <div className="border-t border-border-hairline bg-bg-base/40 p-3.5 space-y-2">
                        {pTasks.length === 0 ? (
                          <div className="py-4 text-center space-y-2">
                            <p className="text-body-sm text-text-tertiary">
                              Proyek ini belum memiliki checklist tugas.
                            </p>
                            <Link
                              href={`/projects/${proj.id}`}
                              prefetch={false}
                              className="inline-flex items-center gap-1 text-caption text-link-teal hover:underline"
                            >
                              <span>+ Tambah langkah tugas di halaman proyek</span>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {pTasks.map((task) => {
                              const isDone = task.status === "done";
                              const directUrl = extractFirstUrl(task.title);
                              const cleanTitle = cleanTaskTitle(task.title);

                              return (
                                <div
                                  key={task.id}
                                  className={`p-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                                    isDone
                                      ? "bg-bg-elevated/40 border-border-hairline/60 text-text-tertiary"
                                      : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong text-text-primary"
                                  }`}
                                >
                                  {/* Left: Safe isolated checkbox button */}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleToggleTask(e, task.id, task.status)
                                      }
                                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
                                        isDone
                                          ? "bg-status-completed border-status-completed text-white"
                                          : "bg-bg-elevated-2 border-border-hairline-strong hover:border-accent text-transparent hover:text-accent/40"
                                      }`}
                                      title={
                                        isDone
                                          ? "Klik untuk batalkan selesai"
                                          : "Tandai tugas ini selesai"
                                      }
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <span
                                        className={`text-body-sm font-medium block truncate ${
                                          isDone
                                            ? "line-through text-text-tertiary"
                                            : "text-text-primary"
                                        }`}
                                      >
                                        {cleanTitle || task.title}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right: Separate Direct Link Button (Anti-accidental click) */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {directUrl && (
                                      <a
                                        href={directUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated-2 hover:bg-accent/15 text-accent border border-border-hairline hover:border-accent text-[11px] font-medium transition-colors"
                                        title="Buka Link Tugas"
                                      >
                                        <span>Link</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}

                                    {task.type === "daily" && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">
                                        Harian
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Active Reminders Schedule Widget (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Reminders Hub Widget */}
          <div className="p-4 rounded-xl bg-bg-elevated border border-border-hairline space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-bold text-text-primary">
                  Pengingat Proyek ({reminders.length})
                </h3>
              </div>
              <Link
                href="/reminders"
                prefetch={false}
                className="text-caption text-link-teal hover:underline inline-flex items-center gap-0.5"
              >
                <span>Kelola</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-[12px] text-text-secondary leading-relaxed">
              Jadwal alarm pengingat aktif yang dikirim setiap hari atau hari tertentu (default jam 07:00 pagi) untuk memastikan pengerjaan tepat waktu.
            </p>

            {reminders.length === 0 ? (
              <div className="p-4 rounded-lg bg-bg-elevated-2 text-center space-y-2">
                <Clock className="w-6 h-6 text-text-tertiary mx-auto" />
                <p className="text-[12px] text-text-secondary">
                  Belum ada pengingat proyek. Pasang pengingat pertama kamu!
                </p>
                <ButtonPrimary
                  onClick={() => {
                    setSelectedReminderProjectId("");
                    setEditingReminder(null);
                    setIsReminderModalOpen(true);
                  }}
                  className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1.5 w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pasang Pengingat</span>
                </ButtonPrimary>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {reminders.map((rem) => {
                  const scheduleLabel = formatReminderSchedule(rem.frequency);
                  const isToday = isReminderActiveToday(rem.frequency);
                  const projectName = rem.projects?.name || "Proyek";

                  return (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-lg border transition-colors space-y-1.5 ${
                        isToday
                          ? "bg-accent/10 border-accent/30"
                          : "bg-bg-elevated-2 border-border-hairline"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-sm font-bold text-text-primary truncate">
                          {projectName}
                        </span>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-on-accent font-bold uppercase tracking-wider">
                            Hari Ini
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
                        <span className="text-accent font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scheduleLabel}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReminderProjectId(rem.project_id || "");
                            setEditingReminder(rem);
                            setIsReminderModalOpen(true);
                          }}
                          className="text-link-teal hover:underline text-[11px]"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <ButtonSecondary
                    onClick={() => {
                      setSelectedReminderProjectId("");
                      setEditingReminder(null);
                      setIsReminderModalOpen(true);
                    }}
                    className="!py-1.5 text-caption inline-flex items-center gap-1.5 w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pengingat Proyek Lain</span>
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3.5 rounded-xl bg-bg-elevated border border-border-hairline space-y-2">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Tips Garapan Rutin</span>
            </div>
            <p className="text-[12px] text-text-tertiary leading-relaxed">
              Sebagian besar snapshot testnet & reset check-in harian terjadi pukul <strong>07:00 WIB</strong> (00:00 UTC). Jadwalkan pengingat proyek kamu agar tidak tertinggal streak harian.
            </p>
          </div>
        </div>
      </div>

      {/* Set Reminder Modal */}
      <SetReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
          setSelectedReminderProjectId("");
        }}
        defaultProjectId={selectedReminderProjectId}
        editingReminder={editingReminder}
        onReminderSaved={() => router.refresh()}
      />
    </div>
  );
}
