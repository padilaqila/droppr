"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  ExternalLink,
  Layers,
  Send,
  Sparkles,
  ArrowRight,
  Edit2,
  Save,
  Info,
  Compass,
  FileText,
  Flame,
  Clock,
  BookOpen,
  Copy,
  Check,
  CheckSquare,
  Globe,
  Droplet,
  Video,
  Bell,
  BellOff,
  FastForward,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Languages,
} from "lucide-react";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { formatReminderSchedule } from "@/lib/supabase/reminders-helper";
import { isProjectDailyDone } from "@/lib/supabase/daily-tasks-helper";
import { getTranslationAction } from "@/lib/utils/language-prefs";
import { useTranslation } from "@/lib/i18n/context";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

interface TodayTaskGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectRow | null;
  tasks: TaskRow[];
  reminder?: ReminderRow | null;
  isSkipped?: boolean;
  onGuideUpdated?: (projectId: string, newGuide: string) => void;
  onSkipProject?: (projectId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  onMarkComplete?: (projectId: string) => Promise<void> | void;
  onOpenReminderModal?: (projectId: string) => void;
  onDeleteReminder?: (reminderId: string) => Promise<void> | void;
}

interface ChannelSource {
  name: string;
  handle: string;
  logo: string | null;
  url: string;
  isPartner: boolean;
}

function detectTelegramChannel(
  socialLinks: Record<string, any>,
  guideContent?: string | null
): ChannelSource | null {
  const combined = [
    socialLinks.telegram_post_url || "",
    socialLinks.telegram || "",
    guideContent || "",
  ].join(" ");

  if (/t\.me\/dutacryptoairdrop/i.test(combined) || /dutacrypto/i.test(combined)) {
    return {
      name: "Duta Crypto Airdrop",
      handle: "@dutacryptoairdrop",
      logo: "/images/credits/dutacrypto.webp",
      url: "https://t.me/dutacryptoairdrop",
      isPartner: true,
    };
  }

  if (/t\.me\/airdropfind/i.test(combined) || /airdropfinder/i.test(combined)) {
    return {
      name: "Airdrop Finder",
      handle: "@airdropfind",
      logo: "/images/credits/airdropfinder.webp",
      url: "https://t.me/airdropfind",
      isPartner: true,
    };
  }

  // Generic Telegram match
  const tgMatch = combined.match(/https?:\/\/t\.me\/([a-zA-Z0-9_+]+)/i);
  if (tgMatch && tgMatch[1]) {
    const channelUsername = tgMatch[1].split("/")[0];
    return {
      name: channelUsername,
      handle: `@${channelUsername}`,
      logo: null,
      url: `https://t.me/${channelUsername}`,
      isPartner: false,
    };
  }

  return null;
}

/**
 * Cleanly separates synthesized structured guide from verbatim raw telegram post
 */
export function extractGuideAndOriginalPost(
  guideContent?: string | null,
  rawSocial?: Record<string, any>
): { formattedGuide: string; originalPost: string } {
  const socialRaw = typeof rawSocial?.raw_text === "string" ? rawSocial.raw_text.trim() : "";
  const content = (guideContent || "").trim();

  if (!content) {
    return {
      formattedGuide: "",
      originalPost: socialRaw,
    };
  }

  // Regex to detect separator inserted by airdrop-parser (e.g. \n---\n#### 📄 Catatan / Pesan Asli Sumber\n)
  const separatorRegex = /(?:\r?\n\s*---\s*)?\r?\n\s*#+\s*📄?\s*(?:Catatan\s*\/)?\s*Pesan Asli(?:\s*Sumber)?\s*[\r\n]+/i;
  const match = content.match(separatorRegex);

  if (match && typeof match.index === "number") {
    const beforePart = content.slice(0, match.index).trim();
    const afterPart = content.slice(match.index + match[0].length).trim();
    return {
      formattedGuide: beforePart,
      originalPost: afterPart || socialRaw,
    };
  }

  // Check simple "---" horizontal divider
  const hrParts = content.split(/\r?\n\s*---\s*\r?\n/);
  if (hrParts.length >= 2) {
    const beforeHr = hrParts[0].trim();
    const afterHr = hrParts.slice(1).join("\n---\n").trim();
    const cleanedOriginal = afterHr.replace(/^#+\s*📄?\s*.*?\r?\n+/i, "").trim();
    return {
      formattedGuide: beforeHr,
      originalPost: cleanedOriginal || socialRaw,
    };
  }

  // If content was structured with synth template
  if (content.includes("### Panduan Garapan:") || content.includes("#### 📋 Langkah Pengerjaan")) {
    return {
      formattedGuide: content,
      originalPost: socialRaw,
    };
  }

  // If content doesn't have template structure, it's raw text
  return {
    formattedGuide: "",
    originalPost: socialRaw || content,
  };
}

/**
 * Parses markdown links [Label](url), raw URLs, and **bold text** into interactive elements
 */
function renderInteractiveInline(text: string): React.ReactNode[] {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'\)]+)|(\*\*([^*]+)\*\*)/g;
  const elements: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      elements.push(text.slice(lastIdx, match.index));
    }

    if (match[1] && match[2]) {
      // [label](url)
      elements.push(
        <a
          key={`md-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-medium transition-colors break-all"
        >
          <span>{match[1]}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    } else if (match[3]) {
      // Raw url
      elements.push(
        <a
          key={`url-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-mono text-[12px] transition-colors break-all"
        >
          <span>{match[3]}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    } else if (match[5]) {
      // **bold**
      elements.push(
        <strong key={`b-${match.index}`} className="font-semibold text-white">
          {match[5]}
        </strong>
      );
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    elements.push(text.slice(lastIdx));
  }

  return elements;
}

interface ParsedSynthGuide {
  isStructured: boolean;
  meta: Array<{ label: string; val: string }>;
  links: Array<{ label: string; url: string }>;
  tasks: Array<{ num: number; type: string; title: string }>;
  notes: string[];
}

function parseSynthGuide(text: string): ParsedSynthGuide {
  const meta: Array<{ label: string; val: string }> = [];
  const links: Array<{ label: string; url: string }> = [];
  const tasks: Array<{ num: number; type: string; title: string }> = [];
  const notes: string[] = [];

  const lines = text.split(/\r?\n/);
  const isStructured =
    text.includes("### Panduan Garapan:") ||
    text.includes("#### 🔗 Tautan Penting") ||
    text.includes("#### Tautan Penting") ||
    text.includes("#### 📋 Langkah Pengerjaan") ||
    text.includes("#### Langkah Pengerjaan");

  if (!isStructured) {
    return { isStructured: false, meta: [], links: [], tasks: [], notes: [] };
  }

  let currentSection: "header" | "links" | "tasks" | "notes" = "header";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes("#### 🔗 Tautan Penting") || line.includes("#### Tautan Penting")) {
      currentSection = "links";
      continue;
    }
    if (line.includes("#### 📋 Langkah Pengerjaan") || line.includes("#### Langkah Pengerjaan")) {
      currentSection = "tasks";
      continue;
    }
    if (line.startsWith("### Panduan Garapan:")) {
      continue;
    }

    if (currentSection === "header") {
      const metaMatch = line.match(/^\*\*([^*:]+):\*\*\s*(.+)$/);
      if (metaMatch) {
        meta.push({ label: metaMatch[1].trim(), val: metaMatch[2].trim() });
      } else {
        notes.push(line);
      }
    } else if (currentSection === "links") {
      const linkMatch = line.match(/^[-*•]?\s*\*\*([^*:]+):\*\*\s*(.+)$/);
      if (linkMatch) {
        const label = linkMatch[1].trim();
        const rawTarget = linkMatch[2].trim();
        const urlMatch = rawTarget.match(/(https?:\/\/[^\s<>"'\)]+)/i);
        if (urlMatch) {
          links.push({ label, url: urlMatch[1] });
        } else {
          links.push({ label, url: rawTarget });
        }
      } else if (line.startsWith("#")) {
        currentSection = "notes";
        notes.push(line);
      } else {
        notes.push(line);
      }
    } else if (currentSection === "tasks") {
      const taskMatch = line.match(/^\d+[\.\)]\s*(?:\[(HARIAN|SEKALI|DAILY|ONE_TIME)\])?\s*(.+)$/i);
      if (taskMatch) {
        const type = (taskMatch[1] || "").toUpperCase();
        const title = taskMatch[2].trim();

        const lowerTitle = title.toLowerCase();
        const isSpam =
          lowerTitle.includes("duta crypto") ||
          lowerTitle.includes("airdrop finder") ||
          lowerTitle.includes("usdt bisa menjadi solusi") ||
          lowerTitle.includes("tonton caranya") ||
          lowerTitle.includes("jp bareng") ||
          lowerTitle.includes("semoga kita") ||
          lowerTitle.includes("youtube") ||
          lowerTitle.includes("disclaimer");

        if (!isSpam && title.length > 2) {
          tasks.push({
            num: tasks.length + 1,
            type: type === "DAILY" ? "HARIAN" : type === "ONE_TIME" ? "SEKALI" : type,
            title,
          });
        }
      } else if (line.startsWith("#")) {
        currentSection = "notes";
        notes.push(line);
      } else {
        notes.push(line);
      }
    } else {
      notes.push(line);
    }
  }

  return { isStructured: true, meta, links, tasks, notes };
}

/**
 * High-end visual renderer for Formatted Guide mode
 */
function renderFormattedGuideContent(formattedGuide: string) {
  const parsed = parseSynthGuide(formattedGuide);

  if (parsed.isStructured) {
    return (
      <div className="space-y-4">
        {/* 1. Meta Pills Row (Network, Biaya, Akun) */}
        {parsed.meta.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {parsed.meta.map((m, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[11.5px]"
              >
                <span className="text-white/50 font-medium">{m.label}:</span>
                <span className="text-white font-semibold">{m.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* 2. Direktori Tautan Penting (Grid Card Visual) */}
        {parsed.links.length > 0 && (
          <div className="space-y-2">
            <div className="text-[12px] font-semibold text-amber-400/90 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Direktori Tautan Resmi ({parsed.links.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parsed.links.map((lnk, idx) => {
                let displayUrl = lnk.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                if (displayUrl.length > 32) {
                  displayUrl = displayUrl.slice(0, 29) + "...";
                }

                let label = lnk.label;
                const isYouTube = lnk.url.includes("youtube.com") || lnk.url.includes("youtu.be");
                if (isYouTube) {
                  label = "Video Panduan YouTube";
                } else if (label === "Tautan Garapan") {
                  label = "Tautan Terkait";
                }

                return (
                  <a
                    key={idx}
                    href={lnk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group/link flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-amber-400/30 transition-all text-left"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span
                        className={`text-[11px] block font-medium transition-colors ${
                          isYouTube
                            ? "text-rose-400 group-hover/link:text-rose-300"
                            : "text-white/50 group-hover/link:text-amber-400/80"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-[12px] text-white/90 font-mono truncate block">
                        {displayUrl}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-white/[0.05] group-hover/link:bg-amber-400 group-hover/link:text-black flex items-center justify-center text-white/60 transition-colors shrink-0">
                      {isYouTube ? (
                        <Video className="w-3.5 h-3.5 text-rose-400 group-hover/link:text-black" />
                      ) : (
                        <ExternalLink className="w-3 h-3" />
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Langkah Pengerjaan (Step Timeline Cards) */}
        {parsed.tasks.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[12px] font-semibold text-amber-400/90 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Langkah Pengerjaan ({parsed.tasks.length})</span>
            </div>
            <div className="space-y-1.5">
              {parsed.tasks.map((st) => (
                <div
                  key={st.num}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {st.num}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {st.type && (
                        <span
                          className={`text-[9.5px] uppercase font-mono font-bold px-1.5 py-0.2 rounded-md ${
                            st.type === "HARIAN"
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "bg-white/[0.06] text-white/60 border border-white/10"
                          }`}
                        >
                          {st.type}
                        </span>
                      )}
                      <span className="text-[12.5px] text-white/90 font-medium leading-relaxed font-sans">
                        {renderInteractiveInline(st.title)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Catatan Tambahan */}
        {parsed.notes.length > 0 && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1 text-[12px] text-white/70 leading-relaxed font-sans">
            {parsed.notes.map((note, idx) => (
              <p key={idx}>{renderInteractiveInline(note)}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Generic Markdown Render jika teks bebas ditulis manual
  const lines = formattedGuide.split(/\r?\n/);
  return (
    <div className="space-y-2 text-body-sm text-white/90 leading-relaxed font-sans">
      {lines.map((l, idx) => {
        const line = l.trim();
        if (!line) return <div key={idx} className="h-2" />;

        if (line.startsWith("### ")) {
          return (
            <div key={idx} className="flex items-center gap-2 pt-2 pb-1">
              <span className="w-1.5 h-3.5 rounded-full bg-amber-400" />
              <h4 className="text-body-md font-bold text-white tracking-tight">
                {line.slice(4)}
              </h4>
            </div>
          );
        }
        if (line.startsWith("#### ")) {
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-white/[0.08] mb-1">
              <h5 className="text-caption font-semibold text-amber-400 uppercase tracking-wider">
                {line.slice(5)}
              </h5>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0 mt-2" />
              <span className="flex-1">{renderInteractiveInline(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInteractiveInline(line)}</p>;
      })}
    </div>
  );
}

/**
 * Parses markdown links [Label](url) and standalone URLs into interactive links (for raw telegram post)
 */
function renderInteractiveGuide(text: string) {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = linkRegex.lastIndex;

    if (matchStart > lastIndex) {
      elements.push(text.slice(lastIndex, matchStart));
    }

    if (match[1] && match[2]) {
      const label = match[1];
      const url = match[2];
      elements.push(
        <a
          key={`md-${matchStart}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-medium transition-colors break-all"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    } else if (match[3]) {
      const url = match[3];
      elements.push(
        <a
          key={`url-${matchStart}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-mono text-[12.5px] transition-colors break-all"
        >
          <span>{url}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

export function TodayTaskGuideModal({
  isOpen,
  onClose,
  project,
  tasks,
  reminder,
  isSkipped = false,
  onGuideUpdated,
  onSkipProject,
  onRestoreProject,
  onMarkComplete,
  onOpenReminderModal,
  onDeleteReminder,
}: TodayTaskGuideModalProps) {
  const { locale, isEn } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open to prevent background scrolling bug
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // View mode: formatted markdown guide vs original raw telegram post
  const [viewMode, setViewMode] = useState<"formatted" | "original">("formatted");

  // Guide editing state
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [guideInput, setGuideInput] = useState("");
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Original Post Translation state
  const [translatedOriginalPost, setTranslatedOriginalPost] = useState<string | null>(null);
  const [isTranslatingOriginal, setIsTranslatingOriginal] = useState(false);
  const [showTranslatedOriginal, setShowTranslatedOriginal] = useState(false);

  // Action states
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [isDoneState, setIsDoneState] = useState(false);
  const [isDeletingReminder, setIsDeletingReminder] = useState(false);

  // Extract raw social links
  const rawSocial = (project?.social_links as Record<string, any>) || {};

  // Clean separation of guide and original post
  const { formattedGuide, originalPost } = React.useMemo(() => {
    if (!project) return { formattedGuide: "", originalPost: "" };
    return extractGuideAndOriginalPost(project.guide_content, rawSocial);
  }, [project?.guide_content, rawSocial]);

  // Translation Action info for Original Post
  const originalPostAction = React.useMemo(() => {
    if (!originalPost) return null;
    return getTranslationAction(originalPost, locale, showTranslatedOriginal);
  }, [originalPost, locale, showTranslatedOriginal]);

  const handleTranslateOriginal = async () => {
    if (!originalPost) return;
    if (translatedOriginalPost) {
      setShowTranslatedOriginal(!showTranslatedOriginal);
      return;
    }

    setIsTranslatingOriginal(true);
    try {
      const action = getTranslationAction(originalPost, locale, false);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalPost,
          targetLang: action.targetLang,
          sourceLang: action.sourceLang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.translatedText) {
        setTranslatedOriginalPost(json.data.translatedText);
        setShowTranslatedOriginal(true);
      }
    } catch (err) {
      console.error("Gagal menerjemahkan panduan postingan:", err);
    } finally {
      setIsTranslatingOriginal(false);
    }
  };

  // Sync guide content when project opens
  React.useEffect(() => {
    if (project) {
      const separated = extractGuideAndOriginalPost(
        project.guide_content,
        (project.social_links as Record<string, any>) || {}
      );
      setGuideInput(separated.formattedGuide || project.guide_content || "");
      setIsEditingGuide(false);
      setViewMode("formatted");
      setIsCopied(false);
      setIsDoneState(isProjectDailyDone(project));
      setTranslatedOriginalPost(null);
      setShowTranslatedOriginal(false);
      setIsTranslatingOriginal(false);
    }
  }, [project]);

  if (!isOpen || !project || !mounted || typeof document === "undefined") return null;

  // Extract meta
  const website = rawSocial.website as string | undefined;
  const dappUrl = rawSocial.dapp_url as string | undefined;
  const telegramPostUrl = rawSocial.telegram_post_url as string | undefined;
  const primaryActionUrl = dappUrl || website || null;

  // Channel source detection
  const channelSource = detectTelegramChannel(rawSocial, project.guide_content);
  const scheduleText = reminder ? formatReminderSchedule(reminder.frequency) : null;

  const handleCopyOriginal = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleMarkDoneClick = async () => {
    if (!project || isMarkingDone) return;
    setIsMarkingDone(true);
    try {
      if (onMarkComplete) {
        await onMarkComplete(project.id);
      }
      setIsDoneState((prev) => !prev);
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handleToggleSkipClick = () => {
    if (!project) return;
    if (isSkipped) {
      onRestoreProject?.(project.id);
    } else {
      onSkipProject?.(project.id);
    }
  };

  const handleDeleteReminderClick = async () => {
    if (!reminder || isDeletingReminder) return;
    if (!confirm(isEn ? "Delete reminder schedule for this project?" : "Hapus jadwal pengingat untuk proyek ini?")) return;
    setIsDeletingReminder(true);
    try {
      if (onDeleteReminder) {
        await onDeleteReminder(reminder.id);
      }
    } finally {
      setIsDeletingReminder(false);
    }
  };

  const handleSaveGuide = async () => {
    setIsSavingGuide(true);
    try {
      const supabase = createClient() as any;
      const newFormatted = guideInput.trim();
      // Re-attach originalPost if it existed so we never lose raw post data
      const finalFullContent = originalPost
        ? `${newFormatted}\n\n---\n#### 📄 Catatan / Pesan Asli Sumber\n${originalPost}`
        : newFormatted;

      const { error } = await supabase
        .from("projects")
        .update({ guide_content: finalFullContent || null })
        .eq("id", project.id);

      if (error) throw error;

      setIsEditingGuide(false);
      if (onGuideUpdated) {
        onGuideUpdated(project.id, finalFullContent);
      }
    } catch (err) {
      console.error("Gagal menyimpan tutorial:", err);
    } finally {
      setIsSavingGuide(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop with Obsidian Blur Overlay (covers full viewport including topbar) */}
      <div className="fixed inset-0 bg-[#07090E]/85 backdrop-blur-xl transition-opacity" />

      {/* Main Frosted Glass Dialog Box */}
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#0c1017]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_0_rgba(255,255,255,0.12)] text-left z-10 flex flex-col max-h-[90vh] overflow-hidden overscroll-contain my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Ambient Highlight Stroke */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-amber-400/80 to-violet-500/30" />

        {/* Modal Header */}
        <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0 flex-1">
              {/* Project Title & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-heading-3 sm:text-heading-2 font-bold text-white font-sans tracking-tight truncate">
                  {project.name}
                </h2>

                {project.chain && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-white/80">
                    {project.chain}
                  </span>
                )}

                <StatusBadge status={project.status.replace("_", "-") as ProjectStatus} />
              </div>

              {/* Source Channel Identity & Schedule */}
              <div className="flex items-center gap-3 text-caption text-white/60 font-sans flex-wrap">
                {/* Source Channel Badge */}
                {channelSource && (
                  <a
                    href={telegramPostUrl || channelSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-medium transition-colors group/ch"
                    title="Buka sumber channel Telegram"
                  >
                    {channelSource.logo ? (
                      <div className="w-4 h-4 rounded-full overflow-hidden relative shrink-0">
                        <Image
                          src={channelSource.logo}
                          alt={channelSource.name}
                          fill
                          className="object-cover"
                          sizes="16px"
                        />
                      </div>
                    ) : (
                      <Send className="w-3 h-3 text-sky-400 shrink-0" />
                    )}
                    <span>{channelSource.name}</span>
                    <span className="text-sky-400/60 font-mono text-[10px]">
                      {channelSource.handle}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/ch:opacity-100 transition-opacity" />
                  </a>
                )}

                {scheduleText && (
                  <span className="inline-flex items-center gap-1.5 text-amber-300/90 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? `Schedule: ${scheduleText} (07:00 WIB)` : `Jadwal: ${scheduleText} (07:00 WIB)`}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label={isEn ? "Close" : "Tutup"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Controls Bar: View Mode Switch & Primary Launch Button */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2">
            {/* View Mode Toggle Pill */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start no-scrollbar">
              <button
                type="button"
                onClick={() => setViewMode("formatted")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  viewMode === "formatted"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isEn ? "Clean Guide" : "Panduan Rapi"}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("original")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  viewMode === "original"
                    ? "bg-sky-400 text-black font-semibold shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isEn ? "Original Post" : "Postingan Asli"}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {telegramPostUrl && (
                <a
                  href={telegramPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/10 text-caption font-medium transition-all"
                  title={isEn ? "Open Telegram Post" : "Buka Postingan Telegram"}
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isEn ? "Open in TG" : "Buka di TG"}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              )}

              {primaryActionUrl && (
                <a
                  href={primaryActionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-semibold text-caption sm:text-body-sm shadow-[0_0_20px_-3px_rgba(240,169,59,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                >
                  <Flame className="w-3.5 h-3.5 fill-black" />
                  <span>{isEn ? `Start Farming ${dappUrl ? "on DApp" : "on Web"}` : `Mulai Garap ${dappUrl ? "di DApp" : "di Web"}`}</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {viewMode === "formatted" ? (
            /* MODE 1: CATATAN & PANDUAN LENGKAP RAPI (Hanya panduan tutorial, tanpa teks pesan asli di bawahnya) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-body-sm font-bold text-white font-sans flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-amber-400" />
                  <span>{isEn ? "Complete Notes & Guide" : "Catatan & Panduan Lengkap"}</span>
                </h3>

                {!isEditingGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuideInput(formattedGuide || "");
                      setIsEditingGuide(true);
                    }}
                    className="text-[11px] text-white/60 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{formattedGuide ? (isEn ? "Edit Tutorial" : "Edit Tutorial") : (isEn ? "+ Write Tutorial" : "+ Tulis Tutorial")}</span>
                  </button>
                )}
              </div>

              {isEditingGuide ? (
                <div className="space-y-2.5">
                  <textarea
                    value={guideInput}
                    onChange={(e) => setGuideInput(e.target.value)}
                    rows={8}
                    placeholder={isEn ? "Write tutorial or step-by-step guide here...\nExample:\n1. Claim daily faucet at https://faucet.xyz\n2. Open testnet and swap/mint" : "Tulis tutorial atau langkah pengerjaan di sini...\nContoh:\n1. Klaim faucet harian di https://faucet.xyz\n2. Masuk ke web testnet dan lakukan swap/mint"}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/20 p-3 text-body-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans leading-relaxed resize-y no-scrollbar"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/40">
                      {isEn ? "Supports automatic web URLs & [Markdown Links](https://link.com)" : "Mendukung tautan URL web otomatis & [Format Markdown](https://link.com)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGuideInput(formattedGuide || "");
                          setIsEditingGuide(false);
                        }}
                        className="px-3 py-1.5 rounded-lg text-caption text-white/60 hover:text-white transition-colors"
                      >
                        {isEn ? "Cancel" : "Batal"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveGuide}
                        disabled={isSavingGuide}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold text-caption transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingGuide ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save Tutorial" : "Simpan Tutorial")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : formattedGuide ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-inner">
                  {renderFormattedGuideContent(formattedGuide)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                  <p className="text-body-sm text-white/60 max-w-md mx-auto">
                    {isEn ? "No structured step-by-step tutorial saved for this project yet. You can write your own guide or read the original source post in the next tab." : "Belum ada tutorial pengerjaan rapi khusus yang disimpan untuk proyek ini. Kamu bisa menulis panduan sendiri atau langsung melihat postingan sumber di tab sebelah."}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGuideInput("");
                        setIsEditingGuide(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30 text-caption font-semibold hover:bg-amber-400/25 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEn ? "Write Notes / Guide" : "Tulis Catatan / Panduan"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-white/80 border border-white/10 text-caption font-medium hover:bg-white/[0.08] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isEn ? "Open Original Post" : "Buka Postingan Asli"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MODE 2: POSTINGAN ASLI TELEGRAM (Murni teks pesan sumber, tanpa template sintesis) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-sky-400" />
                  <h3 className="text-body-sm font-bold text-white font-sans">
                    {isEn ? "Original Telegram Channel Post" : "Postingan Asli Kanal Telegram"}
                  </h3>
                </div>

                {/* Action Buttons: Translate & Quick Copy */}
                <div className="flex items-center gap-2">
                  {originalPostAction?.shouldShowTranslate && (
                    <button
                      type="button"
                      onClick={handleTranslateOriginal}
                      disabled={isTranslatingOriginal}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-caption font-medium transition-all ${
                        showTranslatedOriginal
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                          : "bg-white/[0.05] hover:bg-white/[0.1] text-white/75 hover:text-white border-white/10"
                      }`}
                      title={isEn ? "Translate post text" : "Terjemahkan teks postingan"}
                    >
                      <Languages className={`w-3.5 h-3.5 ${isTranslatingOriginal ? "animate-spin text-amber-400" : ""}`} />
                      <span>
                        {isTranslatingOriginal
                          ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                          : showTranslatedOriginal
                          ? originalPostAction.revertLabel
                          : originalPostAction.buttonLabel}
                      </span>
                    </button>
                  )}

                  {originalPost && (
                    <button
                      type="button"
                      onClick={() => {
                        const textToCopy = showTranslatedOriginal && translatedOriginalPost ? translatedOriginalPost : originalPost;
                        handleCopyOriginal(textToCopy);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-caption text-white/75 hover:text-white transition-colors"
                      title={isEn ? "Copy post content to clipboard" : "Salin isi postingan ke clipboard"}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">{isEn ? "Copied!" : "Tersalin!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-sky-400" />
                          <span>{isEn ? "Copy Post" : "Salin Postingan"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Telegram Message Card Container */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1322]/50 border border-sky-500/20 space-y-3 shadow-md">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
                  {channelSource?.logo ? (
                    <div className="w-7 h-7 rounded-full overflow-hidden relative shrink-0 border border-white/20">
                      <Image
                        src={channelSource.logo}
                        alt={channelSource.name}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className="text-body-sm font-bold text-white block truncate">
                      {channelSource?.name || (isEn ? "Telegram Channel" : "Kanal Telegram")}
                    </span>
                    <span className="text-[11px] text-sky-400/80 font-mono block truncate">
                      {channelSource?.handle || (isEn ? "Telegram Channel" : "Kanal Telegram")}
                    </span>
                  </div>

                  {telegramPostUrl && (
                    <a
                      href={telegramPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-caption text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium shrink-0"
                    >
                      <span>{isEn ? "Open in Telegram" : "Buka di Telegram"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Content: Murni postingan asli / hasil terjemahan */}
                <div className="text-body-sm text-white/85 whitespace-pre-wrap leading-relaxed font-sans space-y-2">
                  {showTranslatedOriginal && translatedOriginalPost && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-400/10 border border-amber-400/20 text-[10.5px] font-medium text-amber-300 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>{locale === "id" ? "Diterjemahkan ke Bahasa Indonesia" : "Translated to English"}</span>
                    </div>
                  )}
                  <div>
                    {originalPost ? (
                      renderInteractiveGuide(
                        showTranslatedOriginal && translatedOriginalPost
                          ? translatedOriginalPost
                          : originalPost
                      )
                    ) : (
                      <span className="text-white/40 italic">
                        {isEn ? "Original post not yet saved or not found for this project." : "Postingan asli belum tersimpan atau tidak ditemukan untuk proyek ini."}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Docked Footer */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Left: Quick Actions (Tandai Selesai & Lewati/Tunda) */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
            {/* Mark as Done button */}
            <button
              type="button"
              onClick={handleMarkDoneClick}
              disabled={isMarkingDone}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption font-semibold transition-all ${
                isDoneState
                  ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-sm hover:bg-emerald-500/35"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border-emerald-500/25"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isDoneState ? (isEn ? "✓ Task Done Today (Reopen)" : "✓ Tugas Selesai Hari Ini (Buka Kembali)") : (isEn ? "Mark Done Today" : "Tandai Selesai Hari Ini")}</span>
            </button>

            {/* Skip / Restore button */}
            <button
              type="button"
              onClick={handleToggleSkipClick}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption font-medium transition-all ${
                isSkipped
                  ? "bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border-amber-400/30"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/10"
              }`}
              title={isSkipped ? (isEn ? "Restore project to today's active list" : "Kembalikan proyek ke daftar aktif hari ini") : (isEn ? "Skip / postpone today's work" : "Lewati / tunda pengerjaan hari ini")}
            >
              {isSkipped ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? "Restore to Today" : "Kembalikan ke Hari Ini"}</span>
                </>
              ) : (
                <>
                  <FastForward className="w-3.5 h-3.5 text-white/50" />
                  <span>{isEn ? "Skip Today" : "Lewati Hari Ini"}</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Reminder Controls & Navigation */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {reminder ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenReminderModal?.(project.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/25 text-caption font-medium transition-all"
                  title={isEn ? "Change reminder time / schedule" : "Ubah jam / jadwal pengingat"}
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? "Change Schedule" : "Ubah Jadwal"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReminderClick}
                  disabled={isDeletingReminder}
                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-caption transition-all"
                  title={isEn ? "Delete Reminder for This Project" : "Hapus Pengingat Proyek Ini"}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenReminderModal?.(project.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 text-caption font-medium transition-all"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>{isEn ? "Set Reminder" : "Pasang Pengingat"}</span>
              </button>
            )}

            <Link
              href={`/projects/${project.id}`}
              prefetch={false}
              className="p-1.5 text-white/40 hover:text-amber-300 rounded-xl hover:bg-white/[0.08] transition-colors"
              title={isEn ? "Open Full Project Workstation" : "Buka Workstation Proyek Penuh"}
            >
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/10 text-caption font-medium transition-all"
            >
              {isEn ? "Close" : "Tutup"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
