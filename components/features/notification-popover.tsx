"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Clock,
  Star,
  ArrowRight,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isProjectDailyDone, toggleProjectDailyTask } from "@/lib/supabase/daily-tasks-helper";
import { isProjectPriority } from "@/lib/supabase/priority-helper";
import { useTranslation } from "@/lib/i18n/context";

interface NotificationProject {
  id: string;
  name: string;
  chain: string | null;
  status: string;
  social_links: any;
}

export function NotificationPopover() {
  const router = useRouter();
  const { isEn } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<NotificationProject[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch projects to evaluate pending daily tasks
  const loadNotificationData = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("id, name, chain, status, social_links")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    loadNotificationData();
  }, []);

  // Filter projects that have not yet completed today's tasks
  const pendingProjects = projects.filter((p) => {
    // Only consider active/in_progress projects
    if (p.status === "completed" || p.status === "waiting") return false;
    return !isProjectDailyDone(p, []);
  });

  // Sort priority projects to top of notification list
  const sortedPendingProjects = [...pendingProjects].sort((a, b) => {
    const aPri = isProjectPriority(a);
    const bPri = isProjectPriority(b);
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return 0;
  });

  const priorityCount = pendingProjects.filter(isProjectPriority).length;
  const unreadCount = pendingProjects.length;

  // Handle outside click & ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleQuickComplete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const currentSocial = (p.social_links as Record<string, any>) || {};
        return {
          ...p,
          social_links: {
            ...currentSocial,
            last_daily_completed_at: new Date().toISOString(),
          },
        };
      })
    );

    try {
      await toggleProjectDailyTask(projectId, true);
      router.refresh();
    } catch (err) {
      console.error("Failed to complete daily task from notification:", err);
      loadNotificationData();
    }
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) loadNotificationData();
          setIsOpen(!isOpen);
        }}
        aria-label={isEn ? "Notifications" : "Notifikasi"}
        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border transition-colors relative ${
          isOpen
            ? "bg-bg-elevated-2 text-text-primary border-accent/50"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 border-border-hairline"
        }`}
        title={
          unreadCount > 0
            ? isEn
              ? `${unreadCount} pending task(s) today`
              : `${unreadCount} tugas garapan belum selesai hari ini`
            : isEn
            ? "Notifications & Tasks"
            : "Notifikasi & Garapan"
        }
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-accent absolute top-1.5 right-1.5 sm:top-2 sm:right-2 ring-2 ring-bg-base animate-pulse" />
        )}
      </button>

      {/* Flyout Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 bg-bg-base/80 border-b border-border-hairline flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-body-sm font-bold text-text-primary leading-tight">
                  {isEn ? "Daily Tasks & Alerts" : "Garapan Hari Ini & Notifikasi"}
                </h4>
                <p className="text-[11px] text-text-tertiary flex items-center gap-1 font-mono mt-0.5">
                  <Clock className="w-3 h-3 text-accent" />
                  <span>Reset: 07:00 WIB</span>
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                {unreadCount} {isEn ? "Pending" : "Belum Beres"}
              </span>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[340px] overflow-y-auto no-scrollbar divide-y divide-border-hairline/60">
            {sortedPendingProjects.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-status-completed/15 border border-status-completed/30 text-status-completed flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "All tasks for today are completed!" : "Semua tugas hari ini sudah selesai!"}
                </p>
                <p className="text-[11.5px] text-text-tertiary">
                  {isEn
                    ? "Great work. Rest easy until the 07:00 WIB reset tomorrow."
                    : "Luar biasa! Santai dulu sampai jadwal reset besok pukul 07:00 WIB."}
                </p>
              </div>
            ) : (
              sortedPendingProjects.slice(0, 6).map((proj) => {
                const isPriority = isProjectPriority(proj);
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/projects/${proj.id}`);
                    }}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-bg-elevated-2 transition-colors cursor-pointer group ${
                      isPriority ? "bg-accent/[0.03]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPriority && (
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent/20 text-accent border border-accent/30 flex items-center gap-0.5"
                            title={isEn ? "High Priority" : "Prioritas Utama"}
                          >
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>PRIORITY</span>
                          </span>
                        )}
                        <span className="text-body-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                          {proj.name}
                        </span>
                        {proj.chain && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-text-tertiary">
                            {proj.chain}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {isEn ? "Daily task not yet marked done" : "Tugas harian belum dicentang selesai"}
                      </p>
                    </div>

                    {/* Quick 1-Click Done Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickComplete(proj.id, e)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 shadow-xs"
                      title={isEn ? "Mark done for today" : "Tandai selesai hari ini"}
                    >
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>{isEn ? "Done" : "Selesai"}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-3 bg-bg-base/90 border-t border-border-hairline flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-caption text-link-teal hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>{isEn ? "Open Dashboard Center" : "Buka Dashboard Utama"}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <span className="text-[11px] font-mono text-text-tertiary">
              {priorityCount > 0 && `⭐ ${priorityCount} Prioritas`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
