"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardDashboardStat } from "@/components/ui/card";
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
  Sparkles,
  Calendar,
  Check,
  Compass,
  AlertCircle,
  RotateCcw,
  Timer,
  FastForward,
  Flame,
  Radio,
  FileText,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { SetReminderModal } from "@/components/features/set-reminder-modal";
import { TodayTaskGuideModal } from "@/components/features/today-task-guide-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  formatReminderSchedule,
  isReminderActiveToday,
} from "@/lib/supabase/reminders-helper";
import {
  isProjectDailyDone,
  toggleProjectDailyTask,
} from "@/lib/supabase/daily-tasks-helper";
import { useTranslation } from "@/lib/i18n/context";

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

export type TaskTabFilter = "ready" | "overdue" | "completed_today" | "upcoming" | "skipped" | "all";

function cleanTaskTitle(text: string): string {
  return text
    .replace(/(https?:\/\/[^\s]+)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function DashboardClientView({
  initialProjects,
  initialTasks,
  initialReminders,
}: DashboardClientViewProps) {
  const router = useRouter();
  const { t, isEn } = useTranslation();

  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [reminders, setReminders] = useState<EnrichedReminder[]>(initialReminders);

  // Filter state for tasks tabs: ready | overdue | upcoming | skipped | all
  const [activeProjectFilter, setActiveProjectFilter] = useState<TaskTabFilter>("ready");

  // Skipped/Snoozed projects state (persisted per day)
  const [skippedProjectIds, setSkippedProjectIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(`droppr_skipped_tasks_${todayKey}`);
      if (stored) {
        setSkippedProjectIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading skipped tasks:", e);
    }
  }, []);

  const handleSkipProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = [...skippedProjectIds.filter((id) => id !== projectId), projectId];
    setSkippedProjectIds(next);
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`droppr_skipped_tasks_${todayKey}`, JSON.stringify(next));
    } catch (e) {}
  };

  const handleRestoreProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = skippedProjectIds.filter((id) => id !== projectId);
    setSkippedProjectIds(next);
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`droppr_skipped_tasks_${todayKey}`, JSON.stringify(next));
    } catch (e) {}
  };

  // Live countdown timer to next daily reset (07:00 WIB / 00:00 UTC)
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextUtcMidnight = new Date();
      nextUtcMidnight.setUTCHours(24, 0, 0, 0);

      const diff = nextUtcMidnight.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("00:00:00");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Today Task Guide Modal state
  const [selectedGuideProject, setSelectedGuideProject] = useState<ProjectRow | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Reminder Modal states
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedReminderProjectId, setSelectedReminderProjectId] = useState<string>("");
  const [editingReminder, setEditingReminder] = useState<EnrichedReminder | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle Project Daily Task Done
  const handleMarkProjectDone = async (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    const pTasks = tasks.filter((t) => t.project_id === projectId);
    const currentlyDone = isProjectDailyDone(proj, pTasks);
    const newStatus = !currentlyDone;

    // Optimistic local state update
    toggleProjectDailyTask(projectId, newStatus);
    const today = new Date().toISOString().slice(0, 10);
    setTasks((prev) =>
      prev.map((t) =>
        t.project_id === projectId
          ? {
              ...t,
              status: newStatus ? "done" : "pending",
              updated_at: newStatus ? new Date().toISOString() : t.updated_at,
            }
          : t
      )
    );

    showToast(
      newStatus
        ? (isEn ? `Tasks marked completed for ${proj.name}` : `Tugas selesai untuk ${proj.name}`)
        : (isEn ? `Tasks reset for ${proj.name}` : `Tugas dibuka kembali untuk ${proj.name}`)
    );

    // Persist to database in background
    try {
      const supabase = createClient();
      const taskIds = pTasks.map((t) => t.id);
      if (taskIds.length > 0) {
        await (supabase as any)
          .from("tasks")
          .update({
            status: newStatus ? "done" : "pending",
            updated_at: new Date().toISOString(),
          })
          .in("id", taskIds);
      }
    } catch (err) {
      console.error("Error updating tasks in db:", err);
    }
  };

  const handleOpenGuideModal = (project: ProjectRow) => {
    setSelectedGuideProject(project);
    setIsGuideModalOpen(true);
  };

  const handleGuideUpdated = (projectId: string, newGuide: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, guide_content: newGuide } : p))
    );
  };

  const handleOpenReminderForProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const existing = reminders.find((r) => r.project_id === projectId) || null;
    setSelectedReminderProjectId(projectId);
    setEditingReminder(existing);
    setIsReminderModalOpen(true);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    showToast(isEn ? "Reminder removed" : "Pengingat berhasil dihapus");
    try {
      const supabase = createClient();
      await (supabase as any).from("reminders").delete().eq("id", reminderId);
    } catch (err) {
      console.error("Delete reminder error:", err);
    }
  };

  // Map reminders by project id for quick O(1) lookup
  const remindersByProjectId = new Map<string, EnrichedReminder>();
  reminders.forEach((r) => {
    if (r.project_id) {
      remindersByProjectId.set(r.project_id, r);
    }
  });

  // Calculate high-level summary statistics
  const totalProjectsCount = projects.length;
  const readyClaimCount = projects.filter((p) => p.status === "ready_to_claim").length;
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "done").length;
  const overallTaskProgress =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Derive categories for today's tasks
  const projectsWithTodayReminders = projects.filter((p) => {
    const r = remindersByProjectId.get(p.id);
    return r ? isReminderActiveToday(r.frequency) : false;
  });

  // 1. Ready to work today (has today reminder or active tasks, not done today, not skipped)
  const readyProjects = projects.filter((p) => {
    if (skippedProjectIds.includes(p.id)) return false;
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    if (isProjectDailyDone(p, pTasks)) return false;
    const r = remindersByProjectId.get(p.id);
    const isToday = r ? isReminderActiveToday(r.frequency) : false;
    return isToday || p.status === "in_progress";
  });

  // 2. Overdue tasks (projects with today reminder not yet completed past morning)
  const overdueProjects = projects.filter((p) => {
    if (skippedProjectIds.includes(p.id)) return false;
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    if (isProjectDailyDone(p, pTasks)) return false;
    const r = remindersByProjectId.get(p.id);
    if (!r) return false;
    return isReminderActiveToday(r.frequency);
  });

  // 3. Completed today
  const completedTodayProjects = projects.filter((p) => {
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    return isProjectDailyDone(p, pTasks);
  });

  // 4. Upcoming / Tomorrow schedules
  const upcomingProjects = projects.filter((p) => {
    const r = remindersByProjectId.get(p.id);
    if (!r) return false;
    const isToday = isReminderActiveToday(r.frequency);
    return !isToday;
  });

  // 5. Skipped / Postponed today
  const skippedProjects = projects.filter((p) => skippedProjectIds.includes(p.id));

  // Determine which projects to display based on active tab
  const displayedProjects = React.useMemo(() => {
    switch (activeProjectFilter) {
      case "ready":
        return readyProjects.length > 0 ? readyProjects : projects.slice(0, 5);
      case "overdue":
        return overdueProjects;
      case "completed_today":
        return completedTodayProjects;
      case "upcoming":
        return upcomingProjects;
      case "skipped":
        return skippedProjects;
      case "all":
      default:
        return projects;
    }
  }, [
    activeProjectFilter,
    readyProjects,
    projects,
    overdueProjects,
    completedTodayProjects,
    upcomingProjects,
    skippedProjects,
  ]);

  return (
    <div className="w-full space-y-6 min-w-0 pb-20 font-sans">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-2.5 rounded-xl bg-bg-elevated border border-accent/40 text-text-primary text-body-sm shadow-xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-accent shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 1. TOP COMMAND CENTER HEADER (EDGE-TO-EDGE FLUID) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Command Center</span>
          </div>
          <h1 className="text-heading-2 sm:text-heading-1 font-bold text-text-primary tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ButtonSecondary
            onClick={() => {
              setSelectedReminderProjectId("");
              setEditingReminder(null);
              setIsReminderModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-caption font-semibold !py-2 !px-3.5"
          >
            <Bell className="w-4 h-4 text-accent" />
            <span>{t("dashboard.setReminder")}</span>
          </ButtonSecondary>

          <Link href="/projects" prefetch={false}>
            <ButtonPrimary className="inline-flex items-center gap-1.5 text-caption font-semibold !py-2 !px-4 shadow-sm shadow-accent/20 active:scale-[0.98]">
              <Plus className="w-4 h-4 text-on-accent" />
              <span>{t("dashboard.addProject")}</span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* 2. TOP STAT SUMMARY CARDS (4 COLUMNS FLUID EDGE-TO-EDGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Jadwal Hari Ini */}
        <CardDashboardStat className="!p-4 sm:!p-5 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
          <div className="flex items-center justify-between text-text-tertiary mb-1.5">
            <span className="text-caption font-medium">{t("dashboard.stats.todaySchedule")}</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-1 font-bold text-text-primary font-mono tracking-tight">
            {projectsWithTodayReminders.length}{" "}
            <span className="text-caption font-sans font-normal text-text-tertiary">
              {t("dashboard.stats.todayProjectsUnit")}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-1 font-mono">
            {t("dashboard.stats.defaultAlarmTime")}
          </div>
        </CardDashboardStat>

        {/* Stat 2: Progress Tugas */}
        <CardDashboardStat className="!p-4 sm:!p-5 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
          <div className="flex items-center justify-between text-text-tertiary mb-1.5">
            <span className="text-caption font-medium">{t("dashboard.stats.taskProgress")}</span>
            <CheckSquare className="w-4 h-4 text-status-completed" />
          </div>
          <div className="text-heading-1 font-bold text-text-primary font-mono tracking-tight">
            {completedTasksCount}{" "}
            <span className="text-caption font-sans font-normal text-text-tertiary">
              / {totalTasksCount}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-1 font-mono">
            {overallTaskProgress}% {t("dashboard.stats.overallComplete")}
          </div>
        </CardDashboardStat>

        {/* Stat 3: Siap Klaim Reward */}
        <CardDashboardStat className="!p-4 sm:!p-5 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
          <div className="flex items-center justify-between text-text-tertiary mb-1.5">
            <span className="text-caption font-medium">{t("dashboard.stats.readyToClaim")}</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-1 font-bold text-accent font-mono tracking-tight">
            {readyClaimCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-1">
            {readyClaimCount > 0 ? t("dashboard.stats.claimPhaseActive") : t("dashboard.stats.waitingSnapshot")}
          </div>
        </CardDashboardStat>

        {/* Stat 4: Total Proyek */}
        <CardDashboardStat className="!p-4 sm:!p-5 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
          <div className="flex items-center justify-between text-text-tertiary mb-1.5">
            <span className="text-caption font-medium">{t("dashboard.stats.totalProjects")}</span>
            <FolderGit2 className="w-4 h-4 text-status-in-progress" />
          </div>
          <div className="text-heading-1 font-bold text-text-primary font-mono tracking-tight">
            {totalProjectsCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-1 font-mono">
            {reminders.length} {t("dashboard.stats.projectsWithReminders")}
          </div>
        </CardDashboardStat>
      </div>

      {/* 3. MAIN WORKSPACE: TWO-COLUMN FULL-WIDTH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN: Project-Based Workstation Cards (lg:col-span-8 xl:col-span-8 2xl:col-span-9) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* Header & Filter Tabs Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-accent shrink-0" />
                  <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary tracking-tight">
                    {t("dashboard.section.todayTasksTitle")}
                  </h2>
                </div>
                <p className="text-[12px] text-text-secondary">
                  {t("dashboard.section.todayTasksDesc")}
                </p>
              </div>

              {/* Reset Info badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] text-text-secondary self-start sm:self-auto font-mono">
                <Timer className="w-3.5 h-3.5 text-accent" />
                <span>Reset: 07:00 WIB ({countdown})</span>
              </div>
            </div>

            {/* Responsive Filter Bar (Wide, Clean Surface, Zero Scrollbar) */}
            <div className="p-1 rounded-xl bg-bg-elevated border border-border-hairline flex items-center gap-1 overflow-x-auto no-scrollbar shadow-none">
              {/* 1. Siap Dikerjakan */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("ready")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "ready"
                    ? "bg-accent text-on-accent font-semibold shadow-none"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${activeProjectFilter === "ready" ? "text-on-accent" : "text-accent"}`} />
                <span>{t("dashboard.tabs.ready")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                    activeProjectFilter === "ready"
                      ? "bg-black/20 text-on-accent"
                      : "bg-bg-elevated-2 text-text-secondary border border-border-hairline"
                  }`}
                >
                  {readyProjects.length}
                </span>
              </button>

              {/* 2. Telat */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("overdue")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "overdue"
                    ? "bg-status-overdue text-white font-semibold shadow-none"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <AlertCircle className={`w-3.5 h-3.5 ${activeProjectFilter === "overdue" ? "text-white" : "text-status-overdue"}`} />
                <span>{t("dashboard.tabs.overdue")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                    activeProjectFilter === "overdue"
                      ? "bg-black/20 text-white"
                      : overdueProjects.length > 0
                      ? "bg-status-overdue/20 text-status-overdue border border-status-overdue/30"
                      : "bg-bg-elevated-2 text-text-secondary border border-border-hairline"
                  }`}
                >
                  {overdueProjects.length}
                </span>
              </button>

              {/* 3. Selesai Hari Ini */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("completed_today")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "completed_today"
                    ? "bg-status-completed text-white font-semibold shadow-none"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeProjectFilter === "completed_today" ? "text-white" : "text-status-completed"}`} />
                <span>{t("dashboard.tabs.completedToday")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                    activeProjectFilter === "completed_today"
                      ? "bg-black/20 text-white"
                      : completedTodayProjects.length > 0
                      ? "bg-status-completed/20 text-status-completed border border-status-completed/30"
                      : "bg-bg-elevated-2 text-text-secondary border border-border-hairline"
                  }`}
                >
                  {completedTodayProjects.length}
                </span>
              </button>

              {/* 4. Akan Datang */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("upcoming")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "upcoming"
                    ? "bg-bg-elevated-2 text-text-primary font-semibold border border-border-hairline"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{t("dashboard.tabs.upcoming")}</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                  {upcomingProjects.length}
                </span>
              </button>

              {/* 5. Dilewati / Ditunda */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("skipped")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "skipped"
                    ? "bg-bg-elevated-2 text-text-primary font-semibold border border-border-hairline"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <FastForward className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{t("dashboard.tabs.skipped")}</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                  {skippedProjects.length}
                </span>
              </button>

              {/* 6. Semua */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "all"
                    ? "bg-bg-elevated-2 text-text-primary font-semibold border border-border-hairline"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <span>{t("dashboard.tabs.all")}</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                  {projects.length}
                </span>
              </button>
            </div>
          </div>

          {/* Project Cards List */}
          {displayedProjects.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-body-md font-semibold text-text-primary">
                {activeProjectFilter === "overdue"
                  ? (isEn ? "Great! No overdue tasks" : "Bagus! Tidak ada tugas yang telat")
                  : activeProjectFilter === "completed_today"
                  ? (isEn ? "No tasks completed today yet" : "Belum ada tugas yang diselesaikan hari ini")
                  : activeProjectFilter === "skipped"
                  ? (isEn ? "No skipped tasks" : "Tidak ada tugas yang sedang dilewati")
                  : activeProjectFilter === "upcoming"
                  ? (isEn ? "No upcoming task schedules" : "Belum ada jadwal tugas mendatang")
                  : (isEn ? "All tasks done or not yet scheduled" : "Semua tugas beres atau belum dijadwalkan")}
              </h3>
              <p className="text-caption text-text-secondary max-w-md mx-auto">
                {activeProjectFilter === "overdue"
                  ? (isEn ? "All your projects are on time or already completed." : "Semua garapan kamu masih tepat waktu atau sudah diselesaikan.")
                  : activeProjectFilter === "completed_today"
                  ? (isEn ? "Mark tasks completed after finishing your daily airdrop tasks." : "Tandai selesai tugas proyek setelah kamu menggarap daily task hari ini.")
                  : activeProjectFilter === "skipped"
                  ? (isEn ? "You can skip daily tasks for specific projects and restore them from this tab." : "Kamu bisa melewati tugas harian proyek tertentu dan memunculkannya kembali di tab ini.")
                  : (isEn ? "You can configure periodic reminders or view all projects." : "Kamu bisa mengatur pengingat berkala atau melihat seluruh daftar garapan proyek.")}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveProjectFilter("all")}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-text-primary text-caption font-semibold transition-colors"
                >
                  {isEn ? "Show All Projects" : "Tampilkan Semua Proyek"} ({projects.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedProjects.map((proj) => {
                const rawSocial = (proj.social_links as Record<string, any>) || {};
                const dappUrl = rawSocial.dapp_url || rawSocial.website;
                const faucetUrl = rawSocial.faucet_url;
                const refLink = rawSocial.ref_link;
                const pTasks = tasks.filter((t) => t.project_id === proj.id);

                const projectReminder = remindersByProjectId.get(proj.id);
                const isTodayReminder = projectReminder
                  ? isReminderActiveToday(projectReminder.frequency)
                  : false;
                const scheduleLabel = projectReminder
                  ? formatReminderSchedule(projectReminder.frequency)
                  : null;

                const isSkipped = skippedProjectIds.includes(proj.id);
                const isDailyDone = isProjectDailyDone(proj, pTasks);

                // Count available links
                let linkCount = 0;
                if (dappUrl) linkCount++;
                if (faucetUrl) linkCount++;
                if (refLink) linkCount++;
                if (rawSocial.twitter) linkCount++;
                if (rawSocial.telegram || rawSocial.telegram_post_url) linkCount++;
                if (rawSocial.discord) linkCount++;
                if (rawSocial.docs_url) linkCount++;
                if (Array.isArray(rawSocial.custom_links)) linkCount += rawSocial.custom_links.length;

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenGuideModal(proj)}
                    className="group rounded-xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-all duration-150 cursor-pointer p-4 sm:p-5 flex flex-col justify-between gap-3.5 shadow-none"
                  >
                    {/* Top Row: Project Name, Badges & Quick Links */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-7 h-7 rounded-md bg-bg-elevated-2 border border-border-hairline text-accent font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                            {proj.name.slice(0, 2).toUpperCase()}
                          </div>

                          <span className="text-body-sm sm:text-base font-bold text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">
                            {proj.name}
                          </span>

                          {proj.chain && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                              {proj.chain}
                            </span>
                          )}

                          <StatusBadge
                            status={proj.status.replace("_", "-") as ProjectStatus}
                          />

                          {/* Dynamic Daily Status Pill */}
                          {isDailyDone ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-status-completed/15 text-status-completed font-semibold border border-status-completed/30 flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-status-completed" />
                              <span>{t("dashboard.tabs.completedToday")}</span>
                            </span>
                          ) : isSkipped ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-text-secondary font-semibold border border-white/[0.1] flex items-center gap-1">
                              <FastForward className="w-3 h-3 text-text-tertiary" />
                              <span>{isEn ? "Skipped Today" : "Dilewati Hari Ini"}</span>
                            </span>
                          ) : activeProjectFilter === "overdue" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-status-overdue/15 text-status-overdue font-semibold border border-status-overdue/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-status-overdue" />
                              <span>{isEn ? "Overdue • 07:00 Schedule" : "Telat • Jadwal 07:00 WIB"}</span>
                            </span>
                          ) : isTodayReminder ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold border border-accent/30 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-accent" />
                              <span>{t("dashboard.stats.todaySchedule")}</span>
                            </span>
                          ) : activeProjectFilter === "upcoming" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold border border-accent/25 flex items-center gap-1 font-mono">
                              <Timer className="w-3 h-3 text-accent" />
                              <span>{isEn ? `Reset in ${countdown}` : `Reset dlm ${countdown}`}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Reminder & Meta Info */}
                        <div className="flex items-center gap-2 text-[11.5px] text-text-tertiary flex-wrap">
                          {scheduleLabel ? (
                            <span className="text-accent font-medium flex items-center gap-1">
                              <Bell className="w-3 h-3 text-accent" />
                              <span>{isEn ? `Reminder: ${scheduleLabel} @ 07:00` : `Pengingat: ${scheduleLabel} @ 07:00 WIB`}</span>
                            </span>
                          ) : (
                            <span>{isEn ? "Active task" : "Tugas garapan aktif"}</span>
                          )}
                          <span>•</span>
                          <span>{pTasks.length} {isEn ? "steps" : "langkah pengerjaan"}</span>
                          {linkCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{linkCount} {isEn ? "links" : "tautan"}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Isolated Quick Actions: DApp & Full Project Link */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 self-end sm:self-start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {dappUrl && (
                          <a
                            href={dappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 text-text-secondary hover:text-text-primary border border-border-hairline text-caption font-medium transition-all"
                            title="Buka Web App DApp Langsung"
                          >
                            <Layers className="w-3.5 h-3.5 text-accent" />
                            <span>{t("common.openDapp")}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        <Link
                          href={`/projects/${proj.id}`}
                          prefetch={false}
                          className="p-1.5 text-text-tertiary hover:text-text-primary rounded-lg hover:bg-white/[0.06] transition-colors"
                          title="Halaman Proyek Lengkap"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Preview of Tasks Steps (Clean, Lightweight, No Checkbox) */}
                    {pTasks.length > 0 ? (
                      <div className="space-y-1.5 py-1">
                        {pTasks.slice(0, 2).map((t, idx) => {
                          const clean = cleanTaskTitle(t.title);
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 text-[12px] text-text-secondary"
                            >
                              <span className="w-4 h-4 rounded bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate flex-1 font-sans">{clean || t.title}</span>
                            </div>
                          );
                        })}
                        {pTasks.length > 2 && (
                          <span className="text-[11px] text-text-tertiary block pl-6 font-mono">
                            +{pTasks.length - 2} {t("dashboard.card.moreSteps")}
                          </span>
                        )}
                      </div>
                    ) : proj.guide_content ? (
                      <p className="text-[12px] text-text-tertiary line-clamp-2 leading-relaxed">
                        {proj.guide_content}
                      </p>
                    ) : null}

                    {/* Card Footer: CTA & Skip / Restore Controls */}
                    <div
                      className="flex items-center justify-between pt-1 flex-wrap gap-2 border-t border-border-hairline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenGuideModal(proj)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-accent hover:text-on-accent border border-border-hairline hover:border-accent text-caption font-semibold text-text-primary transition-all duration-150"
                      >
                        <Compass className="w-3.5 h-3.5 text-accent group-hover:text-on-accent transition-colors" />
                        <span>{t("dashboard.card.openGuide")}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Quick Mark Done for Today button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkProjectDone(proj.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-caption font-semibold transition-all shadow-none ${
                            isDailyDone
                              ? "bg-status-completed/15 text-status-completed border-status-completed/30 hover:bg-status-completed/25"
                              : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 border-border-hairline"
                          }`}
                          title={
                            isDailyDone
                              ? t("dashboard.card.doneTooltip")
                              : t("dashboard.card.undoneTooltip")
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDailyDone ? t("dashboard.card.done") : t("dashboard.card.markDone")}</span>
                        </button>

                        {isSkipped ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleRestoreProject(proj.id, e)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[11px] font-medium transition-all"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{t("dashboard.card.restoreToday")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenReminderForProject(proj.id, e)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 text-text-secondary hover:text-text-primary border border-border-hairline text-[11px] font-medium transition-all"
                            >
                              <Bell className="w-3 h-3 text-accent" />
                              <span>{t("dashboard.card.reRemind")}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSkipProject(proj.id, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 text-text-tertiary hover:text-text-secondary border border-border-hairline text-[11px] font-medium transition-all"
                            title={t("dashboard.card.skipTooltip")}
                          >
                            <FastForward className="w-3 h-3" />
                            <span>{t("dashboard.card.skipToday")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Active Reminders Schedule Widget (lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-5) */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-5">
          {/* Reminders Hub Widget */}
          <div className="rounded-xl bg-bg-elevated border border-border-hairline p-4 sm:p-5 space-y-3.5 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-body-sm font-bold text-text-primary">
                  {t("dashboard.remindersWidget.title")} ({reminders.length})
                </h3>
              </div>
              <Link
                href="/reminders"
                prefetch={false}
                className="text-caption text-link-teal hover:underline inline-flex items-center gap-0.5"
              >
                <span>{t("dashboard.remindersWidget.manage")}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-[12px] text-text-secondary leading-relaxed">
              {t("dashboard.remindersWidget.desc")}
            </p>

            {reminders.length === 0 ? (
              <div className="p-4 rounded-lg bg-bg-base border border-border-hairline text-center space-y-2">
                <Clock className="w-6 h-6 text-text-tertiary mx-auto" />
                <p className="text-[12px] text-text-secondary">
                  {t("dashboard.remindersWidget.emptyDesc")}
                </p>
                <ButtonPrimary
                  onClick={() => {
                    setSelectedReminderProjectId("");
                    setEditingReminder(null);
                    setIsReminderModalOpen(true);
                  }}
                  className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1.5 w-full justify-center shadow-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("dashboard.remindersWidget.setReminderBtn")}</span>
                </ButtonPrimary>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar pr-0.5">
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
                          : "bg-bg-base hover:bg-bg-elevated-2 border-border-hairline"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-sm font-bold text-text-primary truncate">
                          {projectName}
                        </span>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-on-accent font-bold uppercase tracking-wider">
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReminderProjectId("");
                      setEditingReminder(null);
                      setIsReminderModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary text-caption font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-accent" />
                    <span>
                      {isEn ? "Add Reminder for Another Project" : "Tambah Pengingat Proyek Lain"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="rounded-xl bg-bg-elevated border border-border-hairline p-4 space-y-2 shadow-none">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{isEn ? "Routine Farming Tips" : "Tips Garapan Rutin"}</span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {isEn ? (
                <>
                  Most testnet snapshots & daily check-in resets happen at <strong>00:00 UTC</strong> (07:00 WIB). Schedule project reminders to maintain your daily streak.
                </>
              ) : (
                <>
                  Sebagian besar snapshot testnet & reset check-in harian terjadi pukul <strong>07:00 WIB</strong> (00:00 UTC). Jadwalkan pengingat proyek kamu agar tidak tertinggal streak harian.
                </>
              )}
            </p>
          </div>

          {/* Quick Workspace Navigation Box (Fills Wide Screen Vertically) */}
          <div className="rounded-xl bg-bg-elevated border border-border-hairline p-4 space-y-2.5 shadow-none">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary font-semibold block">
              {isEn ? "Quick Navigation" : "Akses Cepat Workspace"}
            </span>
            <div className="space-y-1.5">
              <Link
                href="/projects"
                prefetch={false}
                className="flex items-center justify-between p-2 rounded-lg bg-bg-base hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-accent" />
                  <span>{isEn ? "Project Directory" : "Direktori Proyek"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/feed"
                prefetch={false}
                className="flex items-center justify-between p-2 rounded-lg bg-bg-base hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-link-teal" />
                  <span>{isEn ? "Live Airdrop Feed" : "Feed Airdrop Terkini"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/waitlist"
                prefetch={false}
                className="flex items-center justify-between p-2 rounded-lg bg-bg-base hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-status-waiting" />
                  <span>{isEn ? "Waitlist Tracker" : "Pelacak Waitlist"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/wallets"
                prefetch={false}
                className="flex items-center justify-between p-2 rounded-lg bg-bg-base hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-status-in-progress" />
                  <span>{isEn ? "Wallets & Accounts" : "Dompet & Akun Garapan"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-primary transition-colors" />
              </Link>
            </div>
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

      {/* Today Task Guide Modal (Landing Page Style popup without checkbox) */}
      <TodayTaskGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => {
          setIsGuideModalOpen(false);
          setSelectedGuideProject(null);
        }}
        project={selectedGuideProject}
        tasks={
          selectedGuideProject
            ? tasks.filter((t) => t.project_id === selectedGuideProject.id)
            : []
        }
        reminder={
          selectedGuideProject
            ? remindersByProjectId.get(selectedGuideProject.id) || null
            : null
        }
        isSkipped={
          selectedGuideProject
            ? skippedProjectIds.includes(selectedGuideProject.id)
            : false
        }
        onGuideUpdated={handleGuideUpdated}
        onSkipProject={(id) => {
          handleSkipProject(id);
        }}
        onRestoreProject={(id) => {
          handleRestoreProject(id);
        }}
        onMarkComplete={handleMarkProjectDone}
        onOpenReminderModal={(id) => {
          handleOpenReminderForProject(id);
        }}
        onDeleteReminder={handleDeleteReminder}
      />
    </div>
  );
}
