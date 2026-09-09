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
  Sparkles,
  Calendar,
  Check,
  Compass,
  BookOpen,
  AlertCircle,
  CalendarX,
  RotateCcw,
  Timer,
  FastForward,
  Flame,
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

  const handleOpenGuideModal = (project: ProjectRow) => {
    setSelectedGuideProject(project);
    setIsGuideModalOpen(true);
  };

  const handleGuideUpdated = (projectId: string, newGuide: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, guide_content: newGuide } : p))
    );
    if (selectedGuideProject && selectedGuideProject.id === projectId) {
      setSelectedGuideProject((prev) => (prev ? { ...prev, guide_content: newGuide } : prev));
    }
  };

  // Quick Open Modal for a specific project
  const handleOpenReminderForProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedReminderProjectId(projectId);
    const existing = reminders.find((r) => r.project_id === projectId);
    setEditingReminder(existing || null);
    setIsReminderModalOpen(true);
  };

  const handleMarkProjectDone = async (projectId: string) => {
    try {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      const pTasks = tasks.filter((t) => t.project_id === projectId);
      const isAlreadyDone = isProjectDailyDone(project, pTasks);
      const nextState = !isAlreadyDone;
      const nowIso = nextState ? new Date().toISOString() : null;

      // Optimistic UI updates
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const s = (p.social_links as Record<string, any>) || {};
          const nextS = { ...s };
          if (nowIso) {
            nextS.last_daily_completed_at = nowIso;
          } else {
            delete nextS.last_daily_completed_at;
          }
          return { ...p, social_links: nextS };
        })
      );

      setTasks((prev) =>
        prev.map((t) =>
          t.project_id === projectId
            ? { ...t, status: nextState ? "done" : "pending", completed_at: nowIso }
            : t
        )
      );

      await toggleProjectDailyTask(projectId, nextState);
      router.refresh();
    } catch (err) {
      console.error("Gagal mengubah status tugas hari ini:", err);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.from("reminders").delete().eq("id", reminderId);
      if (error) throw error;
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      router.refresh();
    } catch (err) {
      console.error("Gagal menghapus pengingat:", err);
    }
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

  // Split projects into non-skipped and skipped
  const nonSkippedProjects = React.useMemo(() => {
    return projects.filter((p) => !skippedProjectIds.includes(p.id));
  }, [projects, skippedProjectIds]);

  const skippedProjects = React.useMemo(() => {
    return projects.filter((p) => skippedProjectIds.includes(p.id));
  }, [projects, skippedProjectIds]);

  // Completed Today: projects whose daily tasks are completed for the current day cycle
  const completedTodayProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const pTasks = tasks.filter((t) => t.project_id === p.id);
      return isProjectDailyDone(p, pTasks);
    });
  }, [projects, tasks]);

  // Overdue: projects scheduled today where time is past 07:00 WIB and not completed today
  const overdueProjects = React.useMemo(() => {
    return nonSkippedProjects.filter((p) => {
      const pTasks = tasks.filter((t) => t.project_id === p.id);
      if (isProjectDailyDone(p, pTasks)) return false;

      const reminder = remindersByProjectId.get(p.id);
      const isTodayReminder = reminder
        ? isReminderActiveToday(reminder.frequency)
        : false;
      return isTodayReminder;
    });
  }, [nonSkippedProjects, tasks, remindersByProjectId]);

  // Ready to work projects (Active and NOT yet completed today)
  const readyProjects = React.useMemo(() => {
    return nonSkippedProjects.filter((p) => {
      const pTasks = tasks.filter((t) => t.project_id === p.id);
      if (isProjectDailyDone(p, pTasks)) return false;

      const reminder = remindersByProjectId.get(p.id);
      const isToday = reminder ? isReminderActiveToday(reminder.frequency) : false;
      return isToday || p.status === "in_progress" || pTasks.length > 0;
    });
  }, [nonSkippedProjects, tasks, remindersByProjectId]);

  // Upcoming: projects waiting for next reset / scheduled
  const upcomingProjects = React.useMemo(() => {
    return nonSkippedProjects.filter((p) => {
      const reminder = remindersByProjectId.get(p.id);
      return Boolean(reminder);
    });
  }, [nonSkippedProjects, remindersByProjectId]);

  // Filter Projects for the main list based on active tab
  const displayedProjects = React.useMemo(() => {
    if (activeProjectFilter === "all") {
      return projects;
    }
    if (activeProjectFilter === "completed_today") {
      return completedTodayProjects;
    }
    if (activeProjectFilter === "skipped") {
      return skippedProjects;
    }
    if (activeProjectFilter === "overdue") {
      return overdueProjects;
    }
    if (activeProjectFilter === "upcoming") {
      return upcomingProjects;
    }
    // Default: "ready"
    return readyProjects;
  }, [
    activeProjectFilter,
    projects,
    readyProjects,
    completedTodayProjects,
    overdueProjects,
    upcomingProjects,
    skippedProjects,
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Command Center Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary">
            {t("dashboard.title")}
          </h1>
          <p className="text-body-sm text-text-secondary">
            {t("dashboard.subtitle")}
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
            <span>{t("dashboard.setReminder")}</span>
          </ButtonSecondary>

          <Link href="/projects" prefetch={false}>
            <ButtonPrimary className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm">
              <Plus className="w-4 h-4 text-on-accent" />
              <span>{t("dashboard.addProject")}</span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">{t("dashboard.stats.todaySchedule")}</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {projectsWithTodayReminders.length}{" "}
            <span className="text-caption font-normal text-text-tertiary">
              {t("dashboard.stats.todayProjectsUnit")}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5 font-mono">
            {t("dashboard.stats.defaultAlarmTime")}
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">{t("dashboard.stats.taskProgress")}</span>
            <CheckSquare className="w-4 h-4 text-status-completed" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {completedTasksCount}{" "}
            <span className="text-caption font-normal text-text-tertiary">
              / {totalTasksCount}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {overallTaskProgress}% {t("dashboard.stats.overallComplete")}
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">{t("dashboard.stats.readyToClaim")}</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-accent">
            {readyClaimCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {readyClaimCount > 0 ? t("dashboard.stats.claimPhaseActive") : t("dashboard.stats.waitingSnapshot")}
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="text-caption font-medium">{t("dashboard.stats.totalProjects")}</span>
            <FolderGit2 className="w-4 h-4 text-status-in-progress" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {totalProjectsCount}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {reminders.length} {t("dashboard.stats.projectsWithReminders")}
          </div>
        </CardDashboardStat>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Project-Based Workstation Cards (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header & Filter Tabs Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                  <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary tracking-tight">
                    {t("dashboard.section.todayTasksTitle")}
                  </h2>
                </div>
                <p className="text-[12px] text-text-secondary">
                  {t("dashboard.section.todayTasksDesc")}
                </p>
              </div>

              {/* Reset Info badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] text-white/60 self-start sm:self-auto font-mono">
                <Timer className="w-3 h-3 text-amber-400" />
                <span>Reset: 07:00 WIB ({countdown})</span>
              </div>
            </div>

            {/* Responsive Filter Bar (Wide, Pure Glass, Zero Scrollbar) */}
            <div className="p-1 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              {/* 1. Siap Dikerjakan */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("ready")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "ready"
                    ? "bg-amber-400 text-black font-semibold shadow-md shadow-amber-400/20"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${activeProjectFilter === "ready" ? "text-black" : "text-amber-400"}`} />
                <span>{t("dashboard.tabs.ready")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "ready"
                      ? "bg-black/20 text-black"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {readyProjects.length}
                </span>
              </button>

              {/* 2. Telat */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("overdue")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "overdue"
                    ? "bg-rose-500 text-white font-semibold shadow-md shadow-rose-500/25"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <AlertCircle className={`w-3.5 h-3.5 ${activeProjectFilter === "overdue" ? "text-white" : "text-rose-400"}`} />
                <span>{t("dashboard.tabs.overdue")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "overdue"
                      ? "bg-black/20 text-white"
                      : overdueProjects.length > 0
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {overdueProjects.length}
                </span>
              </button>

              {/* 3. Selesai Hari Ini */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("completed_today")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "completed_today"
                    ? "bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/25"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeProjectFilter === "completed_today" ? "text-white" : "text-emerald-400"}`} />
                <span>{t("dashboard.tabs.completedToday")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "completed_today"
                      ? "bg-black/20 text-white"
                      : completedTodayProjects.length > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {completedTodayProjects.length}
                </span>
              </button>

              {/* 3. Akan Datang */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("upcoming")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "upcoming"
                    ? "bg-amber-400 text-black font-semibold shadow-md shadow-amber-400/20"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${activeProjectFilter === "upcoming" ? "text-black" : "text-amber-400"}`} />
                <span>{t("dashboard.tabs.upcoming")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "upcoming"
                      ? "bg-black/20 text-black"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {upcomingProjects.length}
                </span>
              </button>

              {/* 4. Dilewati / Ditunda */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("skipped")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "skipped"
                    ? "bg-white/20 text-white font-semibold shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <FastForward className={`w-3.5 h-3.5 ${activeProjectFilter === "skipped" ? "text-white" : "text-white/50"}`} />
                <span>{t("dashboard.tabs.skipped")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "skipped"
                      ? "bg-black/20 text-white"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {skippedProjects.length}
                </span>
              </button>

              {/* 5. Semua */}
              <button
                type="button"
                onClick={() => setActiveProjectFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeProjectFilter === "all"
                    ? "bg-white/20 text-white font-semibold shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span>{t("dashboard.tabs.all")}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeProjectFilter === "all"
                      ? "bg-black/20 text-white"
                      : "bg-white/[0.08] text-white/70"
                  }`}
                >
                  {projects.length}
                </span>
              </button>
            </div>
          </div>

          {/* Project Cards List */}
          {displayedProjects.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] text-center space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="w-12 h-12 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-heading-3 font-semibold text-text-primary">
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
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
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
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-text-primary text-caption font-medium transition-colors"
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
                    className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.2] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-200 cursor-pointer p-4 sm:p-5 flex flex-col justify-between gap-3.5"
                  >
                    {/* Top Row: Project Name, Badges & Quick Links */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body-md sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors tracking-tight truncate">
                            {proj.name}
                          </span>

                          {proj.chain && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-white/70">
                              {proj.chain}
                            </span>
                          )}

                          <StatusBadge
                            status={proj.status.replace("_", "-") as ProjectStatus}
                          />

                          {/* Dynamic Daily Status Pill */}
                          {isDailyDone ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{t("dashboard.tabs.completedToday")}</span>
                            </span>
                          ) : isSkipped ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/70 font-semibold border border-white/15 flex items-center gap-1">
                              <FastForward className="w-3 h-3 text-white/50" />
                              <span>{isEn ? "Skipped Today" : "Dilewati Hari Ini"}</span>
                            </span>
                          ) : activeProjectFilter === "overdue" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              <span>{isEn ? "Overdue • 07:00 Schedule" : "Telat • Jadwal 07:00 WIB"}</span>
                            </span>
                          ) : isTodayReminder ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/30 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{t("dashboard.stats.todaySchedule")}</span>
                            </span>
                          ) : activeProjectFilter === "upcoming" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/25 flex items-center gap-1 font-mono">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span>{isEn ? `Reset in ${countdown}` : `Reset dlm ${countdown}`}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Reminder & Meta Info */}
                        <div className="flex items-center gap-2 text-[11.5px] text-white/50 flex-wrap">
                          {scheduleLabel ? (
                            <span className="text-amber-400/90 font-medium flex items-center gap-1">
                              <Bell className="w-3 h-3 text-amber-400" />
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/10 text-caption font-medium transition-all"
                            title="Buka Web App DApp Langsung"
                          >
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t("common.openDapp")}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        <Link
                          href={`/projects/${proj.id}`}
                          prefetch={false}
                          className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
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
                              className="flex items-center gap-2 text-[12px] text-white/75"
                            >
                              <span className="w-4 h-4 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate flex-1 font-sans">{clean || t.title}</span>
                            </div>
                          );
                        })}
                        {pTasks.length > 2 && (
                          <span className="text-[11px] text-white/40 block pl-6">
                            +{pTasks.length - 2} {t("dashboard.card.moreSteps")}
                          </span>
                        )}
                      </div>
                    ) : proj.guide_content ? (
                      <p className="text-[12px] text-white/60 line-clamp-2 leading-relaxed">
                        {proj.guide_content}
                      </p>
                    ) : null}

                    {/* Card Footer: CTA & Skip / Restore Controls */}
                    <div
                      className="flex items-center justify-between pt-1 flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenGuideModal(proj)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-amber-400 hover:text-black border border-white/10 hover:border-amber-400 text-caption font-semibold text-white/90 transition-all duration-200 shadow-sm"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-400 hover:text-black transition-colors" />
                        <span>{t("dashboard.card.openGuide")}</span>
                        <ArrowRight className="w-3 h-3 hover:translate-x-0.5 transition-transform" />
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Quick Mark Done for Today button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkProjectDone(proj.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption font-semibold transition-all shadow-xs ${
                            isDailyDone
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border-white/10"
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[11px] font-medium transition-all"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{t("dashboard.card.restoreToday")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenReminderForProject(proj.id, e)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 text-[11px] font-medium transition-all"
                            >
                              <Bell className="w-3 h-3 text-amber-400" />
                              <span>{t("dashboard.card.reRemind")}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSkipProject(proj.id, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white/80 border border-white/10 text-[11px] font-medium transition-all"
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

        {/* RIGHT COLUMN: Active Reminders Schedule Widget (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Reminders Hub Widget - Frosted Glass Container */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] p-4 sm:p-5 space-y-3.5">
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
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center space-y-2">
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
                  className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1.5 w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("dashboard.remindersWidget.setReminderBtn")}</span>
                </ButtonPrimary>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
                {reminders.map((rem) => {
                  const scheduleLabel = formatReminderSchedule(rem.frequency);
                  const isToday = isReminderActiveToday(rem.frequency);
                  const projectName = rem.projects?.name || "Proyek";

                  return (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-xl border transition-colors space-y-1.5 ${
                        isToday
                          ? "bg-amber-400/[0.08] border-amber-400/30"
                          : "bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06]"
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReminderProjectId("");
                      setEditingReminder(null);
                      setIsReminderModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white text-caption font-medium transition-colors inline-flex items-center justify-center gap-1.5"
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

          {/* Quick Guidance Box - Frosted Glass Container */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{isEn ? "Routine Farming Tips" : "Tips Garapan Rutin"}</span>
            </div>
            <p className="text-[12px] text-text-tertiary leading-relaxed">
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
