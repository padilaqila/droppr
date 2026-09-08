"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import { ButtonSecondary, ButtonPrimary } from "@/components/ui/button";
import { ArrowLeft, Plus, Globe, Send, ExternalLink, ShieldAlert, CheckCircle2, Circle } from "lucide-react";
import { CreateTaskModal } from "@/components/features/create-task-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

interface ProjectDetail extends ProjectRow {
  tasks?: TaskRow[];
  accounts?: AccountRow[];
}

interface ProjectDetailClientViewProps {
  project: ProjectDetail;
}

export function ProjectDetailClientView({ project }: ProjectDetailClientViewProps) {
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>(project.tasks || []);

  const badgeStatus = project.status.replace("_", "-") as ProjectStatus;
  const socialLinks = (project.social_links as Record<string, string>) || {};

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "pending" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      const supabase = createClient() as any;
      await supabase
        .from("tasks")
        .update({
          status: nextStatus,
          completed_at: nextStatus === "done" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke daftar project</span>
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-1 font-semibold text-text-primary">
              {project.name}
            </h1>
            <StatusBadge status={badgeStatus} />
          </div>
          <p className="text-body-sm text-text-secondary font-mono mt-1">
            Chain: {project.chain || "Belum ditentukan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonPrimary
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Task</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Section 1: Social Links */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Link Sosial & Dokumen
        </h2>
        {Object.keys(socialLinks).length > 0 ? (
          <div className="flex flex-wrap gap-2 text-body-sm">
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Website
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <Globe className="w-3.5 h-3.5" /> Twitter / X
              </a>
            )}
            {socialLinks.telegram && (
              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <Send className="w-3.5 h-3.5" /> Telegram
              </a>
            )}
            {socialLinks.discord && (
              <a
                href={socialLinks.discord}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <Globe className="w-3.5 h-3.5" /> Discord
              </a>
            )}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada link sosial yang disimpan.
          </p>
        )}
      </CardBase>

      {/* Section 2: Panduan Kerja (Guide) */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Panduan Kerja (Guide)
        </h2>
        {project.guide_content ? (
          <div className="p-4 rounded-md bg-bg-elevated-2 text-body-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {project.guide_content}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada catatan atau panduan kerja untuk project ini.
          </p>
        )}
      </CardBase>

      {/* Section 3: Task List */}
      <CardBase className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-app-section-title font-semibold text-text-primary">
            Daftar Task ({tasks.filter((t) => t.status === "done").length}/{tasks.length})
          </h2>
          <ButtonSecondary
            onClick={() => setIsTaskModalOpen(true)}
            className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Task</span>
          </ButtonSecondary>
        </div>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isDone = task.status === "done";
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className={`p-3 rounded-md bg-bg-elevated-2 border border-border-hairline flex items-center justify-between cursor-pointer hover:border-border-hairline-strong transition-colors select-none ${
                    isDone ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-status-completed" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-tertiary" />
                    )}
                    <span
                      className={`text-body-sm text-text-primary ${
                        isDone ? "line-through text-text-tertiary" : ""
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <span className="text-caption font-mono text-text-tertiary uppercase">
                    {task.type}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada task yang dibuat untuk project ini.
          </p>
        )}
      </CardBase>

      {/* Section 4: Akun Terkait (Non-sensitif) */}
      <CardBase className="space-y-2">
        <div className="flex items-center gap-2 text-caption text-text-tertiary">
          <ShieldAlert className="w-3.5 h-3.5 text-accent" />
          <span>Akun non-sensitif (Droppr tidak pernah menyimpan password)</span>
        </div>
        {project.accounts && project.accounts.length > 0 ? (
          <div className="space-y-2 pt-1">
            {project.accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-md bg-bg-elevated-2 text-body-sm flex items-center justify-between"
              >
                <span className="text-text-secondary">{acc.label}:</span>
                <span className="text-text-primary font-mono">{acc.username_email}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada akun terkait yang disimpan.
          </p>
        )}
      </CardBase>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={project.id}
        onTaskCreated={() => router.refresh()}
      />
    </div>
  );
}
