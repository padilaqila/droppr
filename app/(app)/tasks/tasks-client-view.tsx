"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary } from "@/components/ui/button";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import {
  CheckSquare,
  Repeat,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  FolderGit2,
  Filter,
  Send,
} from "lucide-react";
import { InteractiveTaskList } from "@/components/features/interactive-task-list";
import { TelegramUpdateModal } from "@/components/features/telegram-update-modal";
import type { Database } from "@/lib/supabase/database.types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

interface TasksClientViewProps {
  initialProjects: ProjectRow[];
  initialTasks: TaskRow[];
}

export function TasksClientView({
  initialProjects,
  initialTasks,
}: TasksClientViewProps) {
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | "pending" | "daily" | "done">("all");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [telegramModalProject, setTelegramModalProject] = useState<string | null>(null);

  // Sync state if initial props change (per MEMORY.md)
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Overall Task Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;
  const dailyTasks = tasks.filter((t) => t.type === "daily").length;
  const dailyCompleted = tasks.filter((t) => t.type === "daily" && t.status === "done").length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectFilter && t.project_id !== selectedProjectFilter) return false;
    if (filter === "pending") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    if (filter === "daily") return t.type === "daily";
    return true;
  });

  // Projects that have tasks under current filter
  const projectsWithFilteredTasks = projects
    .map((p) => {
      const pTasks = filteredTasks.filter((t) => t.project_id === p.id);
      const allPTasks = tasks.filter((t) => t.project_id === p.id);
      const doneCount = allPTasks.filter((t) => t.status === "done").length;
      return {
        ...p,
        filteredTasks: pTasks,
        allTasks: allPTasks,
        doneCount,
        totalCount: allPTasks.length,
      };
    })
    .filter((p) => (filter === "all" && !selectedProjectFilter ? p.allTasks.length > 0 : p.filteredTasks.length > 0));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary">
            Daftar Tugas & Checklist Harian
          </h1>
          <p className="text-body-sm text-text-secondary">
            Semua langkah garapan dari seluruh proyek airdrop dalam satu tempat.
          </p>
        </div>

        <Link href="/projects" prefetch={false}>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-on-accent" />
            <span>Tambah Proyek Baru</span>
          </ButtonPrimary>
        </Link>
      </div>

      {/* Progress & Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-1">
          <span className="text-caption text-text-tertiary">Total Langkah</span>
          <div className="text-heading-3 font-bold text-text-primary">
            {totalTasks}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-1">
          <span className="text-caption text-text-tertiary">Belum Selesai</span>
          <div className="text-heading-3 font-bold text-accent">
            {pendingTasks}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-1">
          <span className="text-caption text-text-tertiary">Rutin Harian (🔁)</span>
          <div className="text-heading-3 font-bold text-link-teal">
            {dailyCompleted}/{dailyTasks}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-1">
          <span className="text-caption text-text-tertiary">Progress Global</span>
          <div className="text-heading-3 font-bold text-status-completed">
            {overallProgress}%
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors shrink-0 ${
              filter === "all"
                ? "bg-accent text-on-accent font-semibold"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
            }`}
          >
            Semua ({totalTasks})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors shrink-0 ${
              filter === "pending"
                ? "bg-accent text-on-accent font-semibold"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
            }`}
          >
            Belum Selesai ({pendingTasks})
          </button>
          <button
            type="button"
            onClick={() => setFilter("daily")}
            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors flex items-center gap-1 shrink-0 ${
              filter === "daily"
                ? "bg-accent text-on-accent font-semibold"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Tugas Harian ({dailyTasks})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("done")}
            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors shrink-0 ${
              filter === "done"
                ? "bg-status-completed text-white font-semibold"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
            }`}
          >
            Selesai ({completedTasks})
          </button>
        </div>

        {/* Project Selector Dropdown filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
            <select
              value={selectedProjectFilter || ""}
              onChange={(e) => setSelectedProjectFilter(e.target.value || null)}
              className="bg-bg-elevated text-caption text-text-secondary px-2.5 py-1 rounded-md border border-border-hairline focus:outline-none cursor-pointer"
            >
              <option value="">Semua Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grouped Project Tasks */}
      {projectsWithFilteredTasks.length === 0 ? (
        <CardBase className="text-center py-12 space-y-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h3 className="text-body-md font-semibold text-text-primary">
            {totalTasks === 0
              ? "Belum ada task aktif"
              : "Tidak ada task pada filter ini"}
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            {totalTasks === 0
              ? "Buka proyekmu dan ketik langkah-langkah kerja untuk mulai melacak garapan airdrop harian."
              : "Semua task pada kategori ini telah selesai atau belum ditambahkan."}
          </p>
        </CardBase>
      ) : (
        <div className="space-y-4">
          {projectsWithFilteredTasks.map((proj) => {
            const rawSocial = (proj.social_links as Record<string, any>) || {};
            const dappUrl = rawSocial.dapp_url || rawSocial.website;
            const badgeStatus = proj.status.replace("_", "-") as ProjectStatus;

            return (
              <CardBase key={proj.id} className="p-4 space-y-3">
                {/* Project Header Bar inside Task List */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-border-hairline">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-bg-elevated-2 border border-border-hairline flex items-center justify-center text-accent shrink-0">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/projects/${proj.id}`}
                          prefetch={false}
                          className="text-body-md font-bold text-text-primary hover:text-accent transition-colors truncate"
                        >
                          {proj.name}
                        </Link>
                        {proj.chain && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                            {proj.chain}
                          </span>
                        )}
                        <StatusBadge status={badgeStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Direct Launch Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {dappUrl && (
                      <a
                        href={dappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-caption font-semibold"
                        title="Buka Web App DApp garapan"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Buka DApp</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setTelegramModalProject(proj.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-link-teal/15 text-link-teal hover:bg-link-teal/25 transition-colors text-caption font-semibold"
                      title="Cek update Telegram proyek ini"
                    >
                      <Send className="w-3 h-3" />
                      <span>Update TG</span>
                    </button>

                    <Link
                      href={`/projects/${proj.id}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary text-caption transition-colors"
                      title="Buka Halaman Proyek"
                    >
                      <span>Detail</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Interactive Task List for this Project */}
                <InteractiveTaskList
                  projectId={proj.id}
                  initialTasks={proj.allTasks}
                  showFilters={false}
                  onTasksUpdated={() => {
                    // Update trigger if needed
                  }}
                />
              </CardBase>
            );
          })}
        </div>
      )}

      {telegramModalProject && (
        <TelegramUpdateModal
          isOpen={Boolean(telegramModalProject)}
          onClose={() => setTelegramModalProject(null)}
          projectName={telegramModalProject}
        />
      )}
    </div>
  );
}
