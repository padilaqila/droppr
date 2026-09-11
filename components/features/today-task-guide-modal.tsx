"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  ExternalLink,
  Layers,
  Send,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  Flame,
  Clock,
  Copy,
  Check,
  Video,
  Bell,
  FastForward,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Languages,
  Zap,
  Sparkles,
  Trophy,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { formatReminderSchedule } from "@/lib/supabase/reminders-helper";
import { isProjectDailyDone } from "@/lib/supabase/daily-tasks-helper";
import { getTranslationAction } from "@/lib/utils/language-prefs";
import { useTranslation } from "@/lib/i18n/context";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

export interface TodayTaskGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Single project or queue of projects
  project?: ProjectRow | null;
  projectsQueue?: ProjectRow[];
  activeProjectIndex?: number;
  onNavigateIndex?: (newIndex: number) => void;
  // Tasks mapping
  tasks?: TaskRow[];
  allTasks?: TaskRow[];
  // Reminders
  reminder?: ReminderRow | null;
  remindersByProjectId?: Map<string, any>;
  // Skip state
  isSkipped?: boolean;
  skippedProjectIds?: string[];
  // Callbacks
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

  if (content.includes("### Panduan Garapan:") || content.includes("#### 📋 Langkah Pengerjaan") || content.includes("#### Langkah Pengerjaan")) {
    const stripped = content
      .replace(/^###\s*Panduan Garapan:[\s\S]*?(?=####|---|$)/i, "")
      .replace(/####\s*.*Langkah Pengerjaan[\s\S]*?(?=####|---|$)/i, "")
      .replace(/####\s*.*Tautan Penting[\s\S]*?(?=####|---|$)/i, "")
      .replace(/^---+\s*/gm, "")
      .trim();

    return {
      formattedGuide: content,
      originalPost: socialRaw || stripped,
    };
  }

  return {
    formattedGuide: "",
    originalPost: socialRaw || content,
  };
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
  projectsQueue,
  activeProjectIndex,
  onNavigateIndex,
  tasks: propTasks = [],
  allTasks,
  reminder: propReminder,
  remindersByProjectId,
  isSkipped: propIsSkipped = false,
  skippedProjectIds,
  onGuideUpdated,
  onSkipProject,
  onRestoreProject,
  onMarkComplete,
  onOpenReminderModal,
  onDeleteReminder,
}: TodayTaskGuideModalProps) {
  const { locale, isEn } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Queue derivation
  const queue = useMemo(() => {
    if (projectsQueue && projectsQueue.length > 0) return projectsQueue;
    if (project) return [project];
    return [];
  }, [projectsQueue, project]);

  const [currentIndex, setCurrentIndex] = useState(activeProjectIndex ?? 0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Animation & Tinder Swipe states
  const [animationState, setAnimationState] = useState<
    "idle" | "sliding-left" | "sliding-right" | "entering-from-right" | "entering-from-left"
  >("idle");
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isSwipingHorizontally = useRef<boolean | null>(null);

  // Guide editing state
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [guideInput, setGuideInput] = useState("");
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Translation state
  const [translatedOriginalPost, setTranslatedOriginalPost] = useState<string | null>(null);
  const [isTranslatingOriginal, setIsTranslatingOriginal] = useState(false);
  const [showTranslatedOriginal, setShowTranslatedOriginal] = useState(false);

  // Action states
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [isDeletingReminder, setIsDeletingReminder] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync active project index
  useEffect(() => {
    if (activeProjectIndex !== undefined && activeProjectIndex >= 0 && activeProjectIndex < queue.length) {
      setCurrentIndex(activeProjectIndex);
      setShowCelebration(false);
    }
  }, [activeProjectIndex, queue.length]);

  // Sync when project prop changes directly
  useEffect(() => {
    if (project && queue.length > 0) {
      const idx = queue.findIndex((p) => p.id === project.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setShowCelebration(false);
      }
    }
  }, [project, queue]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const currentProject = queue[currentIndex] || null;

  // Derive per-project tasks, reminder, skipped status
  const currentTasks = useMemo(() => {
    if (!currentProject) return [];
    if (allTasks) return allTasks.filter((t) => t.project_id === currentProject.id);
    return propTasks;
  }, [currentProject, allTasks, propTasks]);

  const currentReminder = useMemo(() => {
    if (!currentProject) return null;
    if (remindersByProjectId) return remindersByProjectId.get(currentProject.id) || null;
    return propReminder || null;
  }, [currentProject, remindersByProjectId, propReminder]);

  const currentIsSkipped = useMemo(() => {
    if (!currentProject) return false;
    if (skippedProjectIds) return skippedProjectIds.includes(currentProject.id);
    return propIsSkipped;
  }, [currentProject, skippedProjectIds, propIsSkipped]);

  const currentIsDone = useMemo(() => {
    if (!currentProject) return false;
    return isProjectDailyDone(currentProject, currentTasks);
  }, [currentProject, currentTasks]);

  // Social & Guide Data
  const rawSocial = useMemo(
    () => (currentProject?.social_links as Record<string, any>) || {},
    [currentProject?.social_links]
  );

  const { formattedGuide, originalPost } = useMemo(() => {
    if (!currentProject) return { formattedGuide: "", originalPost: "" };
    return extractGuideAndOriginalPost(currentProject.guide_content, rawSocial);
  }, [currentProject, rawSocial]);

  const parsedSynth = useMemo(() => {
    return parseSynthGuide(formattedGuide || currentProject?.guide_content || "");
  }, [formattedGuide, currentProject?.guide_content]);

  const officialLinks = useMemo(() => {
    const links: Array<{ label: string; url: string }> = [];
    const seenUrls = new Set<string>();

    const addLink = (label: string, url?: string | null) => {
      if (!url || typeof url !== "string") return;
      const cleanUrl = url.trim();
      if (!cleanUrl || !cleanUrl.startsWith("http")) return;
      if (seenUrls.has(cleanUrl.toLowerCase())) return;
      seenUrls.add(cleanUrl.toLowerCase());
      links.push({ label, url: cleanUrl });
    };

    if (parsedSynth.links && parsedSynth.links.length > 0) {
      for (const l of parsedSynth.links) {
        addLink(l.label, l.url);
      }
    }

    addLink("DApp / Testnet", rawSocial.dapp_url);
    addLink("Website Resmi", rawSocial.website);
    addLink("Faucet Testnet", rawSocial.faucet_url);
    addLink("Dokumentasi / Docs", rawSocial.docs_url);
    addLink("X / Twitter", rawSocial.twitter);
    addLink("Telegram", rawSocial.telegram);
    addLink("Postingan Sumber", rawSocial.telegram_post_url);
    addLink("Discord Server", rawSocial.discord);
    addLink("Link Referral", rawSocial.ref_link);

    return links;
  }, [parsedSynth.links, rawSocial]);

  const rawPostContent = useMemo(() => {
    if (originalPost) return originalPost;
    if (rawSocial.raw_text) return rawSocial.raw_text;
    if (parsedSynth.isStructured && parsedSynth.notes.length > 0) {
      return parsedSynth.notes.join("\n\n");
    }
    return currentProject?.guide_content || "";
  }, [originalPost, rawSocial.raw_text, parsedSynth, currentProject?.guide_content]);

  const originalPostAction = useMemo(() => {
    if (!rawPostContent) return null;
    return getTranslationAction(rawPostContent, locale, showTranslatedOriginal);
  }, [rawPostContent, locale, showTranslatedOriginal]);

  // Reset internal states on active project change
  useEffect(() => {
    if (currentProject) {
      setGuideInput(rawPostContent || currentProject.guide_content || "");
      setIsEditingGuide(false);
      setIsCopied(false);
      setTranslatedOriginalPost(null);
      setShowTranslatedOriginal(false);
      setIsTranslatingOriginal(false);
      setDragOffset(0);
    }
  }, [currentProject, rawPostContent]);

  // Translation handler
  const handleTranslateOriginal = async () => {
    if (!rawPostContent) return;
    if (translatedOriginalPost) {
      setShowTranslatedOriginal(!showTranslatedOriginal);
      return;
    }

    setIsTranslatingOriginal(true);
    try {
      const action = getTranslationAction(rawPostContent, locale, false);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawPostContent,
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

  // Touch Swipe Handlers (Tinder-style)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditingGuide) return;
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
    isSwipingHorizontally.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isEditingGuide) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - dragStartX.current;
    const diffY = currentY - dragStartY.current;

    if (isSwipingHorizontally.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isSwipingHorizontally.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isSwipingHorizontally.current) {
      setDragOffset(diffX * 0.85);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset < -75) {
      handleAutoAdvanceNext();
    } else if (dragOffset > 75) {
      handleNavigatePrev();
    }
    setDragOffset(0);
    isSwipingHorizontally.current = null;
  };

  // Auto-advance helper (Tinder slide-out effect)
  const handleAutoAdvanceNext = () => {
    if (animationState !== "idle") return;
    setAnimationState("sliding-left");
    setTimeout(() => {
      if (currentIndex + 1 < queue.length) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        onNavigateIndex?.(nextIdx);
        setAnimationState("entering-from-right");
        setTimeout(() => setAnimationState("idle"), 60);
      } else {
        setShowCelebration(true);
        setAnimationState("idle");
      }
    }, 200);
  };

  const handleNavigatePrev = () => {
    if (currentIndex <= 0 || animationState !== "idle") return;
    setAnimationState("sliding-right");
    setTimeout(() => {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      onNavigateIndex?.(prevIdx);
      setAnimationState("entering-from-left");
      setTimeout(() => setAnimationState("idle"), 60);
    }, 200);
  };

  // Complete & Auto Advance
  const handleMarkDoneAndAdvance = async () => {
    if (!currentProject || isMarkingDone) return;
    setIsMarkingDone(true);
    try {
      if (onMarkComplete) {
        await onMarkComplete(currentProject.id);
      }
      handleAutoAdvanceNext();
    } finally {
      setIsMarkingDone(false);
    }
  };

  // Skip & Auto Advance
  const handleSkipAndAdvance = () => {
    if (!currentProject) return;
    if (currentIsSkipped) {
      onRestoreProject?.(currentProject.id);
    } else {
      onSkipProject?.(currentProject.id);
    }
    handleAutoAdvanceNext();
  };

  const actionsRef = useRef({
    handleAutoAdvanceNext,
    handleNavigatePrev,
    handleMarkDoneAndAdvance,
    handleSkipAndAdvance,
  });

  useEffect(() => {
    actionsRef.current = {
      handleAutoAdvanceNext,
      handleNavigatePrev,
      handleMarkDoneAndAdvance,
      handleSkipAndAdvance,
    };
  });

  // Keyboard Shortcuts (ArrowRight, ArrowLeft, S, L, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        actionsRef.current.handleAutoAdvanceNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        actionsRef.current.handleNavigatePrev();
      } else if (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "c") {
        e.preventDefault();
        actionsRef.current.handleMarkDoneAndAdvance();
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        actionsRef.current.handleSkipAndAdvance();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleDeleteReminderClick = async () => {
    if (!currentReminder || isDeletingReminder) return;
    if (!confirm(isEn ? "Delete reminder schedule for this project?" : "Hapus jadwal pengingat untuk proyek ini?")) return;
    setIsDeletingReminder(true);
    try {
      if (onDeleteReminder) {
        await onDeleteReminder(currentReminder.id);
      }
    } finally {
      setIsDeletingReminder(false);
    }
  };

  const handleSaveGuide = async () => {
    if (!currentProject) return;
    setIsSavingGuide(true);
    try {
      const supabase = createClient() as any;
      const newFormatted = guideInput.trim();
      const finalFullContent = originalPost
        ? `${newFormatted}\n\n---\n#### 📄 Catatan / Pesan Asli Sumber\n${originalPost}`
        : newFormatted;

      const { error } = await supabase
        .from("projects")
        .update({ guide_content: finalFullContent || null })
        .eq("id", currentProject.id);

      if (error) throw error;

      setIsEditingGuide(false);
      if (onGuideUpdated) {
        onGuideUpdated(currentProject.id, finalFullContent);
      }
    } catch (err) {
      console.error("Gagal menyimpan tutorial:", err);
    } finally {
      setIsSavingGuide(false);
    }
  };

  const handleCopyOriginal = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  // Queue statistics for celebration & progress bar
  const totalQueueCount = queue.length;
  const progressPercent = totalQueueCount > 0 ? Math.round(((currentIndex + 1) / totalQueueCount) * 100) : 100;
  const doneCount = queue.filter((p) => isProjectDailyDone(p, allTasks ? allTasks.filter((t) => t.project_id === p.id) : undefined)).length;
  const skippedCount = skippedProjectIds ? queue.filter((p) => skippedProjectIds.includes(p.id)).length : 0;

  // Transition style calculation
  let transformStyle = "";
  let transitionStyle = "";

  if (isDragging && dragOffset !== 0) {
    transformStyle = `translateX(${dragOffset}px) rotate(${dragOffset * 0.03}deg)`;
    transitionStyle = "none";
  } else if (animationState === "sliding-left") {
    transformStyle = "translateX(-80px) rotate(-3deg)";
    transitionStyle = "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
  } else if (animationState === "sliding-right") {
    transformStyle = "translateX(80px) rotate(3deg)";
    transitionStyle = "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
  } else if (animationState === "entering-from-right") {
    transformStyle = "translateX(40px)";
    transitionStyle = "all 0.15s ease-out";
  } else if (animationState === "entering-from-left") {
    transformStyle = "translateX(-40px)";
    transitionStyle = "all 0.15s ease-out";
  } else {
    transformStyle = "translateX(0px) rotate(0deg)";
    transitionStyle = "all 0.2s ease-out";
  }

  const opacityStyle =
    animationState === "sliding-left" || animationState === "sliding-right"
      ? 0
      : animationState === "entering-from-right" || animationState === "entering-from-left"
      ? 0.5
      : 1;

  // Render Celebration Screen
  if (showCelebration || !currentProject) {
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-[#07090E]/80 backdrop-blur-md transition-opacity" />

        <div
          className="relative w-full max-w-lg rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl p-6 sm:p-8 text-center z-10 flex flex-col items-center gap-5 my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Ambient top highlight */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-amber-400/80 to-emerald-500/30" />

          {/* Celebration Icon */}
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-lg shadow-accent/10 relative">
            <Trophy className="w-8 h-8" />
            <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-heading-2 font-bold text-text-primary tracking-tight">
              {isEn ? "Session Complete! 🎉" : "Sesi Garap Selesai! 🎉"}
            </h3>
            <p className="text-body-sm text-text-secondary max-w-xs mx-auto">
              {isEn
                ? "All tasks in today's focus queue have been finished or reviewed."
                : "Semua tugas di antrean fokus hari ini telah selesai digarap atau ditinjau."}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 w-full pt-1">
            <div className="p-3 rounded-xl bg-bg-base border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">{isEn ? "Total Queue" : "Total Antrean"}</span>
              <span className="text-heading-3 font-mono font-bold text-text-primary">{totalQueueCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-status-completed/10 border border-status-completed/30">
              <span className="text-[11px] text-status-completed block">{isEn ? "Done Today" : "Selesai Hari Ini"}</span>
              <span className="text-heading-3 font-mono font-bold text-status-completed">{doneCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-base border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">{isEn ? "Skipped" : "Dilewati"}</span>
              <span className="text-heading-3 font-mono font-bold text-text-secondary">{skippedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary font-mono">
            <Clock className="w-3 h-3 text-accent" />
            <span>Reset otomatis besok: 07:00 WIB</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 w-full pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCelebration(false);
                setCurrentIndex(0);
                onNavigateIndex?.(0);
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border border-border-hairline text-caption font-semibold transition-all"
            >
              {isEn ? "Review from Start" : "Tinjau dari Awal"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-pressed text-on-accent font-semibold text-caption shadow-md transition-all"
            >
              {isEn ? "Done & Return" : "Kembali ke Dashboard"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Meta shortcuts
  const website = rawSocial.website as string | undefined;
  const dappUrl = rawSocial.dapp_url as string | undefined;
  const telegramPostUrl = rawSocial.telegram_post_url as string | undefined;
  const primaryActionUrl = dappUrl || website || null;
  const channelSource = detectTelegramChannel(rawSocial, currentProject.guide_content);
  const scheduleText = currentReminder ? formatReminderSchedule(currentReminder.frequency) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Dynamic Backdrop */}
      <div className="fixed inset-0 bg-[#07090E]/80 backdrop-blur-md transition-opacity" />

      {/* Main Dialog Box */}
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl text-left z-10 flex flex-col max-h-[92vh] overflow-hidden overscroll-contain my-auto animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Ambient Highlight */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-amber-400/80 to-violet-500/30" />

        {/* 1. TINDER-STYLE QUEUE PROGRESS & FAST-FLOW CONTROLS STRIP */}
        <div className="px-4 py-2.5 sm:px-6 bg-bg-base/70 border-b border-border-hairline flex items-center justify-between gap-3 text-caption">
          {/* Left: Queue Position & Segmented progress */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-bg-elevated border border-border-hairline font-mono font-bold text-accent text-[11px]">
              <Zap className="w-3 h-3 fill-current" />
              <span>
                {currentIndex + 1} / {totalQueueCount}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <span>{progressPercent}% {isEn ? "Session Done" : "Selesai"}</span>
            </div>
          </div>

          {/* Center: Slim Progress Bar */}
          <div className="flex-1 max-w-[180px] sm:max-w-[240px] h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Right: Keyboard Hints & Navigation Chevrons */}
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline-block text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.05]">
              ← / → {isEn ? "Swipe" : "Geser"}
            </span>

            <div className="flex items-center rounded-lg bg-bg-elevated border border-border-hairline p-0.5">
              <button
                type="button"
                onClick={handleNavigatePrev}
                disabled={currentIndex === 0}
                className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                title={isEn ? "Previous Task (←)" : "Tugas Sebelumnya (←)"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAutoAdvanceNext}
                disabled={currentIndex === totalQueueCount - 1}
                className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                title={isEn ? "Next Task (→)" : "Tugas Berikutnya (→)"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={isEn ? "Close" : "Tutup"}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SWIPE CARD CONTAINER (Dynamic transform during drag/tilt) */}
        <div
          className="flex-1 flex flex-col overflow-hidden relative"
          style={{
            transform: transformStyle,
            transition: transitionStyle,
            opacity: opacityStyle,
          }}
        >
          {/* Visual Swipe Indicators / Stamps when dragging */}
          {isDragging && dragOffset > 30 && (
            <div className="absolute top-4 left-4 z-50 px-3 py-1 rounded-xl border-2 border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold text-caption tracking-wider uppercase rotate-[-8deg] pointer-events-none shadow-lg animate-in fade-in duration-100">
              ✓ {isEn ? "DONE / ADVANCE" : "SELESAI"}
            </div>
          )}
          {isDragging && dragOffset < -30 && (
            <div className="absolute top-4 right-4 z-50 px-3 py-1 rounded-xl border-2 border-amber-500 bg-amber-500/20 text-amber-400 font-bold text-caption tracking-wider uppercase rotate-[8deg] pointer-events-none shadow-lg animate-in fade-in duration-100">
              ⏩ {isEn ? "SKIP / NEXT" : "LEWATI"}
            </div>
          )}

          {/* Modal Header */}
          <div className="px-5 pt-4 pb-3.5 sm:px-6 sm:pt-5 sm:pb-3.5 border-b border-border-hairline bg-bg-elevated">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                {/* Project Title & Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-heading-3 sm:text-heading-2 font-bold text-text-primary font-sans tracking-tight truncate">
                    {currentProject.name}
                  </h2>

                  {currentProject.chain && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-secondary">
                      {currentProject.chain}
                    </span>
                  )}

                  <StatusBadge status={currentProject.status} />

                  {currentIsDone && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{isEn ? "Done Today" : "Selesai Hari Ini"}</span>
                    </span>
                  )}

                  {currentIsSkipped && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-400 border border-amber-400/30 flex items-center gap-1">
                      <FastForward className="w-3 h-3" />
                      <span>{isEn ? "Skipped" : "Dilewati"}</span>
                    </span>
                  )}
                </div>

                {/* Source Channel Identity & Schedule */}
                <div className="flex items-center gap-3 text-caption text-text-secondary font-sans flex-wrap">
                  {channelSource && (
                    <a
                      href={telegramPostUrl || channelSource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-500 dark:text-sky-300 text-[11px] font-medium transition-colors group/ch"
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
                        <Send className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0" />
                      )}
                      <span>{channelSource.name}</span>
                      <span className="text-sky-500/70 dark:text-sky-400/60 font-mono text-[10px]">
                        {channelSource.handle}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/ch:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {scheduleText && (
                    <span className="inline-flex items-center gap-1.5 text-amber-500 dark:text-amber-300/90 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>{isEn ? `Schedule: ${scheduleText} (07:00 WIB)` : `Jadwal: ${scheduleText} (07:00 WIB)`}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Launch & TG Buttons in header */}
              <div className="flex items-center gap-2 shrink-0">
                {telegramPostUrl && (
                  <a
                    href={telegramPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-text-primary border border-border-hairline text-caption font-medium transition-all"
                    title={isEn ? "Open Telegram Post" : "Buka Postingan Telegram"}
                  >
                    <Send className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    <span className="hidden sm:inline">{isEn ? "Open in TG" : "Buka di TG"}</span>
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
                    <span>{isEn ? `Farm ${dappUrl ? "on DApp" : "on Web"}` : `Mulai Garap ${dappUrl ? "di DApp" : "di Web"}`}</span>
                    <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar bg-bg-elevated">
            {/* Header Row: Title & Edit Button */}
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-bold text-text-primary font-sans flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-400" />
                <span>{isEn ? "Project Guide & Post" : "Catatan & Panduan Lengkap"}</span>
              </h3>

              {!isEditingGuide && (
                <button
                  type="button"
                  onClick={() => {
                    setGuideInput(rawPostContent || currentProject.guide_content || "");
                    setIsEditingGuide(true);
                  }}
                  className="text-[11px] text-text-secondary hover:text-amber-500 dark:hover:text-amber-300 flex items-center gap-1 transition-colors font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{rawPostContent ? (isEn ? "Edit Notes" : "Edit Catatan") : (isEn ? "+ Write Notes" : "+ Tulis Catatan")}</span>
                </button>
              )}
            </div>

            {isEditingGuide ? (
              <div className="space-y-2.5">
                <textarea
                  value={guideInput}
                  onChange={(e) => setGuideInput(e.target.value)}
                  rows={10}
                  placeholder={isEn ? "Write notes or guide here..." : "Tulis catatan atau panduan di sini..."}
                  className="w-full rounded-xl bg-bg-base border border-border-hairline p-3 text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans leading-relaxed resize-y no-scrollbar"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-tertiary">
                    {isEn ? "Supports automatic web URLs & Markdown links" : "Mendukung tautan URL web otomatis & format Markdown"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGuideInput(rawPostContent || currentProject.guide_content || "");
                        setIsEditingGuide(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-caption text-text-secondary hover:text-text-primary transition-colors"
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
                      <span>{isSavingGuide ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save Notes" : "Simpan Catatan")}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-bg-base border border-border-hairline space-y-4">
                {/* Meta Pills Row */}
                {parsedSynth.meta.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {parsedSynth.meta.map((m, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-bg-elevated border border-border-hairline text-[11.5px]"
                      >
                        <span className="text-text-secondary font-medium">{m.label}:</span>
                        <span className="text-text-primary font-semibold">{m.val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Direktori Tautan Resmi */}
                {officialLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[12px] font-semibold text-amber-500 dark:text-amber-400/90 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>{isEn ? `Official Links Directory (${officialLinks.length})` : `Direktori Tautan Resmi (${officialLinks.length})`}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {officialLinks.map((lnk, idx) => {
                        let displayUrl = lnk.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                        if (displayUrl.length > 32) {
                          displayUrl = displayUrl.slice(0, 29) + "...";
                        }

                        let label = lnk.label;
                        const isYouTube = lnk.url.includes("youtube.com") || lnk.url.includes("youtu.be");
                        if (isYouTube) {
                          label = isEn ? "YouTube Guide Video" : "Video Panduan YouTube";
                        } else if (label === "Tautan Garapan") {
                          label = isEn ? "Related Link" : "Tautan Terkait";
                        }

                        return (
                          <a
                            key={idx}
                            href={lnk.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group/link flex items-center justify-between p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline hover:border-amber-400/50 transition-all text-left"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span
                                className={`text-[11px] block font-medium transition-colors ${
                                  isYouTube
                                    ? "text-rose-500 dark:text-rose-400 group-hover/link:text-rose-600 dark:group-hover/link:text-rose-300"
                                    : "text-text-secondary group-hover/link:text-amber-500 dark:group-hover/link:text-amber-400"
                                }`}
                              >
                                {label}
                              </span>
                              <span className="text-[12px] text-text-primary font-mono truncate block">
                                {displayUrl}
                              </span>
                            </div>
                            <div className="w-6 h-6 rounded-lg bg-bg-base group-hover/link:bg-amber-400 group-hover/link:text-black flex items-center justify-center text-text-secondary transition-colors shrink-0">
                              {isYouTube ? (
                                <Video className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 group-hover/link:text-black" />
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

                {/* Postingan Asli Telegram */}
                <div className="space-y-2 pt-2 border-t border-border-hairline">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-[12px] font-semibold text-sky-500 dark:text-sky-400/90 flex items-center gap-1.5 uppercase tracking-wider">
                      <Send className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>{isEn ? "Original Telegram Post" : "Postingan Asli Telegram"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {originalPostAction?.shouldShowTranslate && (
                        <button
                          type="button"
                          onClick={handleTranslateOriginal}
                          disabled={isTranslatingOriginal}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-caption font-medium transition-all ${
                            showTranslatedOriginal
                              ? "bg-amber-400/20 text-amber-600 dark:text-amber-300 border-amber-400/40"
                              : "bg-bg-elevated hover:bg-bg-elevated-2 text-text-secondary hover:text-text-primary border-border-hairline"
                          }`}
                          title={isEn ? "Translate post text" : "Terjemahkan teks postingan"}
                        >
                          <Languages className={`w-3.5 h-3.5 ${isTranslatingOriginal ? "animate-spin text-amber-500" : ""}`} />
                          <span>
                            {isTranslatingOriginal
                              ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                              : showTranslatedOriginal
                              ? originalPostAction.revertLabel
                              : originalPostAction.buttonLabel}
                          </span>
                        </button>
                      )}

                      {rawPostContent && (
                        <button
                          type="button"
                          onClick={() => {
                            const textToCopy = showTranslatedOriginal && translatedOriginalPost ? translatedOriginalPost : rawPostContent;
                            handleCopyOriginal(textToCopy);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary transition-colors"
                          title={isEn ? "Copy post content to clipboard" : "Salin isi postingan ke clipboard"}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{isEn ? "Copied!" : "Tersalin!"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                              <span>{isEn ? "Copy Post" : "Salin Postingan"}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Telegram Message Box */}
                  <div className="p-4 sm:p-5 rounded-xl bg-bg-elevated border border-border-hairline space-y-3">
                    {channelSource && (
                      <div className="flex items-center gap-2.5 pb-3 border-b border-border-hairline">
                        {channelSource.logo ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden relative shrink-0 border border-border-hairline">
                            <Image
                              src={channelSource.logo}
                              alt={channelSource.name}
                              fill
                              className="object-cover"
                              sizes="24px"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                            <Send className="w-3 h-3" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="text-caption font-bold text-text-primary block truncate">
                            {channelSource.name}
                          </span>
                          <span className="text-[10.5px] text-sky-600 dark:text-sky-400/80 font-mono block truncate">
                            {channelSource.handle}
                          </span>
                        </div>

                        {telegramPostUrl && (
                          <a
                            href={telegramPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 inline-flex items-center gap-1 font-medium shrink-0"
                          >
                            <span>{isEn ? "Open in TG" : "Buka di TG"}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="text-body-sm text-text-primary whitespace-pre-wrap leading-relaxed font-sans space-y-2">
                      {showTranslatedOriginal && translatedOriginalPost && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-[10.5px] font-medium text-amber-700 dark:text-amber-300 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>{locale === "id" ? "Diterjemahkan ke Bahasa Indonesia" : "Translated to English"}</span>
                        </div>
                      )}
                      <div>
                        {rawPostContent ? (
                          renderInteractiveGuide(
                            showTranslatedOriginal && translatedOriginalPost ? translatedOriginalPost : rawPostContent
                          )
                        ) : (
                          <span className="text-text-tertiary italic text-[12px]">
                            {isEn ? "No guide notes or Telegram post available for this project." : "Belum ada catatan panduan atau postingan Telegram untuk proyek ini."}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. FOOTER ACTION BAR: AUTO-ADVANCE & TINDER-STYLE EXECUTION */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-t border-border-hairline bg-bg-base flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Quick Execution Buttons (with Auto-Advance) */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Mark Done & Auto-Advance */}
            <button
              type="button"
              onClick={handleMarkDoneAndAdvance}
              disabled={isMarkingDone}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-caption border transition-all shadow-sm ${
                currentIsDone
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-transparent"
              } active:scale-[0.98]`}
              title={
                currentIsDone
                  ? (isEn ? "Mark done again / Advance to next" : "Tandai selesai & geser ke tugas berikutnya")
                  : (isEn ? "Mark Done & Auto Advance to Next Task (S)" : "Tandai Selesai & Otomatis Geser ke Tugas Berikutnya (S)")
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {currentIsDone
                  ? (isEn ? "Done Today (Next →)" : "Sudah Selesai (Lanjut →)")
                  : (isEn ? "✓ Done Today & Next →" : "✓ Selesai & Lanjut →")}
              </span>
            </button>

            {/* Skip & Auto-Advance */}
            <button
              type="button"
              onClick={handleSkipAndAdvance}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-caption font-medium transition-all ${
                currentIsSkipped
                  ? "bg-amber-400/20 hover:bg-amber-400/30 text-amber-700 dark:text-amber-300 border-amber-400/40"
                  : "bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border-border-hairline"
              } active:scale-[0.98]`}
              title={
                currentIsSkipped
                  ? (isEn ? "Restore & Advance (L)" : "Kembalikan & Lanjut (L)")
                  : (isEn ? "Skip Today & Advance to Next (L)" : "Lewati Hari Ini & Geser ke Berikutnya (L)")
              }
            >
              {currentIsSkipped ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{isEn ? "Restore & Next →" : "Kembalikan & Lanjut →"}</span>
                </>
              ) : (
                <>
                  <FastForward className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>{isEn ? "Skip & Next →" : "Lewati Hari Ini →"}</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Manual Navigation, Reminder, & Exit */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Quick Step Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNavigatePrev}
                disabled={currentIndex === 0}
                className="px-2.5 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                title={isEn ? "Previous (←)" : "Sebelumnya (←)"}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEn ? "Prev" : "Sebelumnya"}</span>
              </button>
              <button
                type="button"
                onClick={handleAutoAdvanceNext}
                disabled={currentIndex === totalQueueCount - 1}
                className="px-2.5 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                title={isEn ? "Next (→)" : "Berikutnya (→)"}
              >
                <span className="hidden sm:inline">{isEn ? "Next" : "Berikutnya"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reminder button */}
            {currentReminder ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenReminderModal?.(currentProject.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-700 dark:text-amber-300 border border-amber-400/35 text-caption font-medium transition-all"
                  title={isEn ? "Change reminder time" : "Ubah jam pengingat"}
                >
                  <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="hidden sm:inline">{isEn ? "Schedule" : "Jadwal"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReminderClick}
                  disabled={isDeletingReminder}
                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-caption transition-all"
                  title={isEn ? "Delete reminder" : "Hapus pengingat"}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenReminderModal?.(currentProject.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border border-border-hairline text-caption font-medium transition-all"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="hidden sm:inline">{isEn ? "Reminder" : "Pengingat"}</span>
              </button>
            )}

            {/* Workstation page link */}
            <Link
              href={`/projects/${currentProject.id}`}
              prefetch={false}
              className="p-2 text-text-tertiary hover:text-amber-500 dark:hover:text-amber-300 rounded-xl hover:bg-bg-elevated-2 transition-colors"
              title={isEn ? "Open Full Project Workstation" : "Buka Workstation Proyek Penuh"}
            >
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-text-primary border border-border-hairline text-caption font-medium transition-all"
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
