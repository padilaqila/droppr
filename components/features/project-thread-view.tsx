"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Send,
  ExternalLink,
  Trash2,
  Newspaper,
  CheckSquare,
  Clock,
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import {
  fetchProjectThreads,
  createProjectThread,
  toggleThreadTaskStatus,
  deleteProjectThread,
  cleanHtmlEntities,
  type ThreadItem,
} from "@/lib/supabase/thread-updates";

interface ProjectThreadViewProps {
  projectId: string;
  projectName: string;
  onOpenTelegramSearch: () => void;
  refreshTrigger?: number;
  onThreadsLoaded?: (threads: ThreadItem[]) => void;
}

/**
 * Render formatted text with auto clickable external links
 */
function renderFormattedContent(rawText: string) {
  const cleaned = cleanHtmlEntities(rawText);
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = cleaned.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-link-teal hover:underline inline-flex items-center gap-0.5 font-mono text-[12px] break-all px-1 py-0.5 rounded bg-bg-elevated border border-border-hairline mx-0.5"
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

export function ProjectThreadView({
  projectId,
  projectName,
  onOpenTelegramSearch,
  refreshTrigger = 0,
  onThreadsLoaded,
}: ProjectThreadViewProps) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "task" | "news">("all");

  // Input states
  const [inputType, setInputType] = useState<"task" | "news">("task");
  const [inputTitle, setInputTitle] = useState("");
  const [inputSourceUrl, setInputSourceUrl] = useState("");
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load threads from Supabase
  const loadThreads = useCallback(async () => {
    try {
      const data = await fetchProjectThreads(projectId);
      setThreads(data);
      if (onThreadsLoaded) onThreadsLoaded(data);
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, onThreadsLoaded]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads, refreshTrigger]);

  // Handle toggle task status (Optimistic UI)
  const handleToggleTask = async (item: ThreadItem) => {
    const nextStatus = item.status === "done" ? "pending" : "done";
    const nowIso = nextStatus === "done" ? new Date().toISOString() : null;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === item.id ? { ...t, status: nextStatus, completed_at: nowIso } : t
      )
    );

    await toggleThreadTaskStatus(projectId, item.id, nextStatus);
  };

  // Handle delete thread item
  const handleDelete = async (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    await deleteProjectThread(projectId, threadId);
  };

  // Handle add thread item
  const handleAddThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = inputTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    const source = inputSourceUrl.trim() || null;

    const newItemPayload = {
      project_id: projectId,
      type: inputType,
      title: title,
      content: null,
      source_url: source,
      status: inputType === "task" ? ("pending" as const) : ("info" as const),
      completed_at: null,
    };

    // Optimistic item
    const tempId = "temp-" + Date.now();
    const optimisticItem: ThreadItem = {
      ...newItemPayload,
      id: tempId,
      created_at: new Date().toISOString(),
    };

    setThreads((prev) => [optimisticItem, ...prev]);
    setInputTitle("");
    setInputSourceUrl("");
    setShowSourceInput(false);

    try {
      const created = await createProjectThread(projectId, newItemPayload);
      setThreads((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch (err) {
      console.error("Failed to add thread:", err);
      setThreads((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  // Filtered thread items
  const filteredThreads = threads.filter((t) => {
    if (filter === "task") return t.type === "task";
    if (filter === "news") return t.type === "news";
    return true;
  });

  const taskCount = threads.filter((t) => t.type === "task").length;
  const completedTaskCount = threads.filter(
    (t) => t.type === "task" && t.status === "done"
  ).length;
  const newsCount = threads.filter((t) => t.type === "news").length;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar: Title, Counters, and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <h2 className="text-body-md font-bold text-text-primary">
              Thread & Riwayat Garapan
            </h2>
          </div>
          <p className="text-caption text-text-secondary mt-0.5">
            Kronologi terpadu langkah kerja, catatan selesai, dan update berita Telegram.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenTelegramSearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-link-teal/15 border border-link-teal/30 text-link-teal hover:bg-link-teal/25 transition-colors text-caption font-semibold shadow-sm"
            title="Cari update tentang proyek ini di Telegram Airdrop Finder & Duta Crypto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Cari Update TG</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Task Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-bg-elevated-2 p-1 rounded-lg text-caption">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              filter === "all"
                ? "bg-bg-elevated text-text-primary font-semibold shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            Semua ({threads.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("task")}
            className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              filter === "task"
                ? "bg-accent/20 text-accent font-semibold shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <CheckSquare className="w-3 h-3" />
            <span>Task ({completedTaskCount}/{taskCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("news")}
            className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              filter === "news"
                ? "bg-link-teal/20 text-link-teal font-semibold shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <Newspaper className="w-3 h-3" />
            <span>Berita & Info ({newsCount})</span>
          </button>
        </div>

        {taskCount > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-text-tertiary">
              Task Selesai: {Math.round((completedTaskCount / taskCount) * 100)}%
            </span>
            <div className="w-24 h-1.5 rounded-full bg-bg-elevated-2 overflow-hidden">
              <div
                className="h-full bg-status-completed transition-all duration-300"
                style={{
                  width: `${Math.round((completedTaskCount / taskCount) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Thread Timeline (Sleek Vertical Stream) */}
      <div className="relative pl-7 space-y-3.5 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-border-hairline/80">
        {loading ? (
          <div className="py-12 text-center text-caption text-text-tertiary">
            Memuat thread proyek...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-6 rounded-lg bg-bg-elevated/40 border border-dashed border-border-hairline text-center space-y-1.5 ml-1">
            <Sparkles className="w-5 h-5 text-accent mx-auto" />
            <p className="text-body-sm font-semibold text-text-primary">
              Thread masih kosong
            </p>
            <p className="text-caption text-text-tertiary max-w-sm mx-auto">
              Mulai tambahkan langkah task baru di bawah, atau klik &quot;Cari Update TG&quot; untuk memasukkan berita garapan dari Telegram.
            </p>
          </div>
        ) : (
          filteredThreads.map((item) => {
            const isTask = item.type === "task";
            const isDone = item.status === "done";
            const isNews = item.type === "news";

            // Clean title and content
            const cleanTitle = cleanHtmlEntities(item.title);
            const cleanContent = cleanHtmlEntities(item.content || "");
            const hasExtraContent = cleanContent && cleanContent.trim() !== cleanTitle.trim();

            return (
              <div key={item.id} className="relative group">
                {/* Timeline Bullet Node */}
                <div className="absolute -left-[27px] top-3 flex items-center justify-center">
                  {isTask ? (
                    <button
                      type="button"
                      onClick={() => handleToggleTask(item)}
                      className="w-5 h-5 rounded-full bg-bg-elevated border border-border-hairline flex items-center justify-center hover:border-accent transition-all focus:outline-none shadow-xs"
                      title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-status-completed" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-text-tertiary hover:text-accent" />
                      )}
                    </button>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-link-teal/15 border border-link-teal/30 flex items-center justify-center text-link-teal shadow-xs">
                      <Newspaper className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Sleek Activity Card Container */}
                <div
                  className={`p-3.5 rounded-lg border transition-all ${
                    isTask && isDone
                      ? "bg-bg-elevated/40 border-border-subtle opacity-70"
                      : isNews
                      ? "bg-bg-elevated/90 border-link-teal/20 hover:border-link-teal/40 hover:bg-bg-elevated"
                      : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong"
                  }`}
                >
                  {/* Card Header: Type Badge, Timestamp, & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono tracking-wider ${
                          isTask
                            ? isDone
                              ? "bg-status-completed/15 text-status-completed border border-status-completed/30"
                              : "bg-accent/15 text-accent border border-accent/30"
                            : "bg-link-teal/15 text-link-teal border border-link-teal/30"
                        }`}
                      >
                        {isTask ? (isDone ? "✓ Selesai" : "⚡ Task") : "📰 Info"}
                      </span>

                      <div className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono">
                        <Clock className="w-3 h-3 text-text-tertiary/70" />
                        <span>{formatDate(item.source_date || item.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated-2 text-link-teal hover:underline text-[11px] font-medium border border-border-hairline"
                          title="Buka sumber asli di Telegram"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>Telegram</span>
                          <ExternalLink className="w-2 h-2" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-text-tertiary hover:text-status-overdue rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus entri thread ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Title / Main Text */}
                  <div
                    className={`text-body-sm font-semibold leading-relaxed break-words ${
                      isTask && isDone
                        ? "line-through text-text-tertiary"
                        : "text-text-primary"
                    }`}
                  >
                    {renderFormattedContent(cleanTitle)}
                  </div>

                  {/* Optional Detail Paragraph (Clean & Readable) */}
                  {hasExtraContent && (
                    <div className="mt-2 pl-3 border-l-2 border-border-hairline text-caption text-text-secondary leading-relaxed whitespace-pre-line break-words">
                      {renderFormattedContent(cleanContent)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modern Thread Quick Input Bar at Bottom */}
      <form
        onSubmit={handleAddThread}
        className="p-3 rounded-lg bg-bg-elevated border border-border-hairline focus-within:border-accent space-y-2.5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Type Toggle: Task vs News */}
          <div className="flex items-center gap-1 bg-bg-elevated-2 p-0.5 rounded-md text-caption">
            <button
              type="button"
              onClick={() => setInputType("task")}
              className={`px-2.5 py-1 rounded text-caption font-semibold flex items-center gap-1.5 transition-colors ${
                inputType === "task"
                  ? "bg-accent/20 text-accent border border-accent/40 shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Langkah Task</span>
            </button>

            <button
              type="button"
              onClick={() => setInputType("news")}
              className={`px-2.5 py-1 rounded text-caption font-semibold flex items-center gap-1.5 transition-colors ${
                inputType === "news"
                  ? "bg-link-teal/20 text-link-teal border border-link-teal/40 shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <Newspaper className="w-3 h-3" />
              <span>Catatan Berita / Update</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSourceInput(!showSourceInput)}
            className={`text-caption inline-flex items-center gap-1 transition-colors ${
              showSourceInput || inputSourceUrl
                ? "text-link-teal font-medium"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>
              {inputSourceUrl ? "Link Sumber Terpasang" : "+ Tambah Link Sumber"}
            </span>
          </button>
        </div>

        {/* Source URL input if toggled */}
        {showSourceInput && (
          <div>
            <input
              type="url"
              value={inputSourceUrl}
              onChange={(e) => setInputSourceUrl(e.target.value)}
              placeholder="https://t.me/... atau https://x.com/... (opsional)"
              className="w-full px-3 py-1 rounded bg-bg-elevated-2 border border-border-hairline text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Title Input & Submit */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder={
              inputType === "task"
                ? `+ Tambah langkah task ${projectName}... (Ketik dan tekan Enter)`
                : `+ Tambah berita/info update ${projectName}... (Ketik dan tekan Enter)`
            }
            className="flex-1 px-3 py-2 rounded-md bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />

          <button
            type="submit"
            disabled={!inputTitle.trim() || isSubmitting}
            className="px-3.5 py-2 rounded-md bg-accent text-text-inverse font-semibold text-caption hover:bg-accent-hover disabled:opacity-40 transition-colors shrink-0 shadow-xs"
          >
            Kirim ke Thread
          </button>
        </div>
      </form>
    </div>
  );
}
