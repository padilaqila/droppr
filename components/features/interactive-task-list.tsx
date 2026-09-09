"use client";

import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Repeat,
  Calendar,
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskType = Database["public"]["Enums"]["task_type"];

interface InteractiveTaskListProps {
  projectId: string;
  initialTasks: TaskRow[];
  onTasksUpdated?: () => void;
  showFilters?: boolean;
}

/**
 * Render task title with clickable links if present
 */
function renderFormattedTitle(title: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = title.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-link-teal hover:underline inline-flex items-center gap-0.5 font-mono text-[12px] break-all px-1 py-0.5 rounded bg-bg-elevated/80 border border-border-hairline mx-1"
          title={`Buka ${part}`}
        >
          <span>{part.length > 35 ? part.slice(0, 32) + "..." : part}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      );
    }
    return part;
  });
}

/**
 * Extract first URL from title if available for quick open button
 */
function extractFirstUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
}

export function InteractiveTaskList({
  projectId,
  initialTasks,
  onTasksUpdated,
  showFilters = true,
}: InteractiveTaskListProps) {
  const { isEn } = useTranslation();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  // Inline Quick Add State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>("one_time");
  const [isAdding, setIsAdding] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Inline Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Sync state if prop changes
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Toggle task status optimistically
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
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

      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Revert if error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: currentStatus as any } : t
        )
      );
    }
  };

  // Inline Quick Add Submission
  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title || isAdding) return;

    setIsAdding(true);
    // Temporary optimistic task
    const tempId = "temp-" + Date.now();
    const optimisticTask: TaskRow = {
      id: tempId,
      project_id: projectId,
      title: title,
      type: newType,
      status: "pending",
      due_date: null,
      recurrence_rule: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, optimisticTask]);
    setNewTitle("");

    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title: title,
          type: newType,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp task with real data
      if (data) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)));
      }
      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error("Failed to insert task:", err);
      // Remove temp task
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsAdding(false);
      addInputRef.current?.focus();
    }
  };

  // Start Inline Edit
  const handleStartEdit = (task: TaskRow) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  // Save Inline Edit
  const handleSaveEdit = async (taskId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t))
    );
    setEditingTaskId(null);

    try {
      const supabase = createClient() as any;
      await supabase
        .from("tasks")
        .update({ title: trimmed, updated_at: new Date().toISOString() })
        .eq("id", taskId);

      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error("Failed to edit task title:", err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const supabase = createClient() as any;
      await supabase.from("tasks").delete().eq("id", taskId);
      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const progressPercent =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header Bar: Filter tabs & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-semibold text-text-primary">
            {isEn ? "Action Steps" : "Langkah Garapan"}
          </span>
          <span className="text-caption font-mono text-text-secondary px-2 py-0.5 rounded-full bg-bg-elevated-2 border border-border-hairline">
            {completedCount}/{tasks.length} ({progressPercent}%)
          </span>
        </div>

        {showFilters && tasks.length > 0 && (
          <div className="flex items-center gap-1 bg-bg-elevated-2 p-0.5 rounded-md text-caption self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
                filter === "all"
                  ? "bg-bg-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {isEn ? "All" : "Semua"}
            </button>
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
                filter === "pending"
                  ? "bg-bg-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {isEn ? `Pending (${tasks.length - completedCount})` : `Belum (${tasks.length - completedCount})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("done")}
              className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
                filter === "done"
                  ? "bg-bg-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {isEn ? `Done (${completedCount})` : `Selesai (${completedCount})`}
            </button>
          </div>
        )}
      </div>

      {/* Mini Progress Bar */}
      {tasks.length > 0 && (
        <div className="w-full h-1.5 rounded-full bg-bg-elevated-2 overflow-hidden">
          <div
            className="h-full bg-status-completed transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Task Rows List */}
      <div className="space-y-1.5">
        {filteredTasks.length === 0 ? (
          <div className="p-4 rounded-md bg-bg-elevated/40 border border-dashed border-border-hairline text-center space-y-1">
            <p className="text-body-sm text-text-secondary">
              {tasks.length === 0
                ? (isEn ? "No action steps for this project yet." : "Belum ada langkah kerja untuk proyek ini.")
                : (isEn ? "No steps in this filter." : "Tidak ada langkah pada filter ini.")}
            </p>
            <p className="text-caption text-text-tertiary">
              {isEn
                ? "Type the first step below and press Enter."
                : "Ketik langsung langkah pertama di baris bawah dan tekan Enter."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === "done";
            const isEditing = editingTaskId === task.id;
            const directUrl = extractFirstUrl(task.title);

            return (
              <div
                key={task.id}
                className={`group relative p-2.5 rounded-md border flex items-center justify-between gap-3 transition-colors ${
                  isDone
                    ? "bg-bg-elevated/40 border-border-subtle opacity-60"
                    : "bg-bg-elevated-2/70 border-border-hairline hover:border-border-hairline-strong"
                }`}
              >
                {/* Left: Checkbox + Title / Edit Input */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="shrink-0 p-0.5 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none"
                    title={
                      isDone
                        ? (isEn ? "Mark as pending" : "Tandai belum selesai")
                        : (isEn ? "Mark as done" : "Tandai selesai")
                    }
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-status-completed" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-tertiary hover:text-accent" />
                    )}
                  </button>

                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(task.id);
                          if (e.key === "Escape") setEditingTaskId(null);
                        }}
                        autoFocus
                        className="w-full bg-bg-elevated px-2 py-1 text-body-sm text-text-primary rounded border border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(task.id)}
                        className="p-1 text-status-completed hover:bg-bg-elevated rounded"
                        title={isEn ? "Save (Enter)" : "Simpan (Enter)"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="p-1 text-text-tertiary hover:bg-bg-elevated rounded"
                        title={isEn ? "Cancel (Esc)" : "Batal (Esc)"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleStartEdit(task)}
                      className={`text-body-sm cursor-pointer select-none truncate hover:text-accent transition-colors ${
                        isDone
                          ? "line-through text-text-tertiary"
                          : "text-text-primary font-medium"
                      }`}
                      title={isEn ? "Click to edit step text" : "Klik untuk ubah teks langkah"}
                    >
                      {renderFormattedTitle(task.title)}
                    </span>
                  )}
                </div>

                {/* Right: Direct Launch Button + Type Badge + Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Direct Quick Link Button if URL detected */}
                    {directUrl && (
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-[11px] font-semibold"
                        title={isEn ? `Open ${directUrl}` : `Buka ${directUrl}`}
                      >
                        <span>{isEn ? "Open" : "Akses"}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {/* Task Type Badge */}
                    {task.type === "daily" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated border border-border-hairline text-accent font-mono inline-flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" />
                        <span>{isEn ? "Daily" : "Harian"}</span>
                      </span>
                    )}
                    {task.type === "weekly" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated border border-border-hairline text-link-teal font-mono inline-flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{isEn ? "Weekly" : "Mingguan"}</span>
                      </span>
                    )}

                    {/* Quick Edit icon */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(task)}
                      className="p-1 text-text-tertiary hover:text-text-primary rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title={isEn ? "Edit step text" : "Ubah teks langkah"}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Delete icon */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-text-tertiary hover:text-status-overdue rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title={isEn ? "Delete this step" : "Hapus langkah ini"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Seamless Inline Quick-Add Form */}
      <form
        onSubmit={handleQuickAdd}
        className="p-2 rounded-md bg-bg-elevated border border-border-hairline focus-within:border-accent flex flex-col sm:flex-row sm:items-center gap-2 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1 text-accent shrink-0">
            <Plus className="w-4 h-4" />
          </div>

          <input
            ref={addInputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              isEn
                ? "+ Add new step... (Type title/link)"
                : "+ Tambah langkah baru... (Ketik judul/link)"
            }
            className="flex-1 bg-transparent text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none min-w-0"
            disabled={isAdding}
          />
        </div>

        {/* Quick frequency toggle */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t border-border-subtle sm:border-0">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as TaskType)}
            className="bg-bg-elevated-2 text-caption text-text-secondary px-2 py-1 rounded border border-border-hairline focus:outline-none cursor-pointer"
            title={isEn ? "Task frequency" : "Frekuensi tugas"}
          >
            <option value="one_time">{isEn ? "Once" : "Sekali"}</option>
            <option value="daily">{isEn ? "Daily 🔁" : "Harian 🔁"}</option>
            <option value="weekly">{isEn ? "Weekly" : "Mingguan"}</option>
          </select>

          <button
            type="submit"
            disabled={!newTitle.trim() || isAdding}
            className="px-2.5 py-1 rounded bg-accent text-on-accent text-caption font-semibold disabled:opacity-40 hover:bg-accent-pressed transition-colors shadow-sm"
          >
            {isAdding
              ? (isEn ? "Saving..." : "Menyimpan...")
              : (isEn ? "Add" : "Tambah")}
          </button>
        </div>
      </form>
    </div>
  );
}
