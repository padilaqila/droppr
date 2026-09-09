"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Send,
  ExternalLink,
  Trash2,
  Newspaper,
  Clock,
  Link as LinkIcon,
  MessageSquare,
  Pin,
  Languages,
} from "lucide-react";
import {
  fetchProjectThreads,
  createProjectThread,
  deleteProjectThread,
  cleanHtmlEntities,
  type ThreadItem,
} from "@/lib/supabase/thread-updates";
import { getTranslationAction } from "@/lib/utils/language-prefs";
import { useTranslation } from "@/lib/i18n/context";

interface ProjectThreadViewProps {
  projectId: string;
  projectName: string;
  projectChain?: string | null;
  guideContent?: string | null;
  socialLinks?: Record<string, any> | null;
  projectCreatedAt?: string | null;
  onOpenTelegramSearch: () => void;
  refreshTrigger?: number;
  onThreadsLoaded?: (threads: ThreadItem[]) => void;
}

interface ChannelSource {
  name: string;
  handle: string;
  logo: string | null;
  url: string;
}

// Detect Telegram channel source info
function getChannelSource(
  socialLinks?: Record<string, any> | null,
  guideContent?: string | null
): ChannelSource {
  const combined = [
    socialLinks?.telegram_post_url || "",
    socialLinks?.telegram || "",
    socialLinks?.channel || "",
    guideContent || "",
  ].join(" ");

  if (/t\.me\/dutacryptoairdrop/i.test(combined) || /dutacrypto/i.test(combined)) {
    return {
      name: "Duta Crypto Airdrop",
      handle: "@dutacryptoairdrop",
      logo: "/images/credits/dutacrypto.webp",
      url: "https://t.me/dutacryptoairdrop",
    };
  }

  if (/t\.me\/airdropfind/i.test(combined) || /airdropfinder/i.test(combined)) {
    return {
      name: "Airdrop Finder",
      handle: "@airdropfind",
      logo: "/images/credits/airdropfinder.webp",
      url: "https://t.me/airdropfind",
    };
  }

  const match = combined.match(/https?:\/\/t\.me\/([a-zA-Z0-9_+]+)/i);
  if (match && match[1]) {
    const ch = match[1].split("/")[0];
    return {
      name: ch,
      handle: `@${ch}`,
      logo: null,
      url: `https://t.me/${ch}`,
    };
  }

  return {
    name: "Airdrop Signal",
    handle: "@telegram",
    logo: null,
    url: "https://t.me",
  };
}

// Format relative or date time
function formatTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return new Date(isoString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Render formatted text with auto clickable external links
 */
function renderInteractivePostText(rawText: string) {
  const cleaned = cleanHtmlEntities(rawText);
  // Match markdown links [text](url) or naked URLs
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      elements.push(cleaned.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      elements.push(
        <a
          key={`md-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-medium break-all transition-colors"
        >
          <span>{match[1]}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 inline" />
        </a>
      );
    } else if (match[3]) {
      const url = match[3];
      elements.push(
        <a
          key={`url-${match.index}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-mono text-[12px] break-all transition-colors"
        >
          <span>{url.length > 40 ? url.slice(0, 37) + "..." : url}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 inline" />
        </a>
      );
    }

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    elements.push(cleaned.slice(lastIndex));
  }

  return elements;
}

function cleanMessageText(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;
  // Clean duplicate URLs e.g. "https://minara.fun/ (https://minara.fun/)" -> "https://minara.fun/"
  text = text.replace(/(https?:\/\/[^\s\)]+)\s*\(\1\)/gi, "$1");
  return text
    .replace(/^---+\s*/gm, "")
    .replace(/^#{1,6}\s+.*(?:Catatan|Pesan Asli|Postingan Asli).*/gim, "")
    .replace(/\*\*+/g, "")
    .replace(/_+\*\*+/g, "")
    .replace(/\*\*+_+/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#036;/g, "$")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Extract STRICTLY only the original telegram post without any synthetic guide or double info
 */
function extractOriginalTelegramText(
  guideContent?: string | null,
  socialLinks?: Record<string, any> | null
): string | null {
  const rawSocial = (socialLinks as Record<string, any>) || {};

  // 1. Highest Priority: verbatim raw_text or original_telegram_text
  if (typeof rawSocial.raw_text === "string" && rawSocial.raw_text.trim()) {
    return cleanMessageText(rawSocial.raw_text);
  }
  if (typeof rawSocial.original_telegram_text === "string" && rawSocial.original_telegram_text.trim()) {
    return cleanMessageText(rawSocial.original_telegram_text);
  }

  if (!guideContent || !guideContent.trim()) return null;

  const text = guideContent.trim();

  // 2. Check for separator: e.g. "#### 📄 Catatan / Pesan Asli Sumber" or "---"
  const separatorRegex = /(?:\r?\n\s*---\s*)?\r?\n\s*#+\s*📄?\s*(?:Catatan\s*\/)?\s*(?:Pesan|Postingan)\s*Asli(?:\s*Sumber)?\s*[\r\n]+/i;
  const match = text.match(separatorRegex);

  if (match && typeof match.index === "number") {
    const afterPart = text.slice(match.index + match[0].length).trim();
    if (afterPart) {
      return cleanMessageText(afterPart);
    }
  }

  // Check fallback separator "POSTINGAN ASLI SUMBER"
  if (text.includes("POSTINGAN ASLI SUMBER")) {
    const parts = text.split(/.*POSTINGAN ASLI SUMBER:?/i);
    if (parts[1] && parts[1].trim()) {
      return cleanMessageText(parts[1]);
    }
  }

  // 3. If there is NO separator, but text contains synthetic template headers:
  // Strip out synthetic header "### Panduan Garapan: ..." and "#### Langkah Pengerjaan"
  if (text.includes("### Panduan Garapan:") || text.includes("#### Langkah Pengerjaan")) {
    const stripped = text
      .replace(/^###\s*Panduan Garapan:[\s\S]*?(?=####|---|$)/i, "")
      .replace(/####\s*.*Langkah Pengerjaan[\s\S]*?(?=####|---|$)/i, "")
      .replace(/####\s*.*Tautan Penting[\s\S]*?(?=####|---|$)/i, "")
      .replace(/^---+\s*/gm, "")
      .trim();

    if (stripped) {
      return cleanMessageText(stripped);
    }
  }

  return cleanMessageText(text);
}

export function ProjectThreadView({
  projectId,
  projectName,
  projectChain,
  guideContent,
  socialLinks,
  projectCreatedAt,
  onOpenTelegramSearch,
  refreshTrigger = 0,
  onThreadsLoaded,
}: ProjectThreadViewProps) {
  const { locale } = useTranslation();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [filter, setFilter] = useState<"all" | "news">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Bottom Input States
  const [inputTitle, setInputTitle] = useState("");
  const [inputSourceUrl, setInputSourceUrl] = useState("");
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Translation State for Postingan Asli
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load project thread updates
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjectThreads(projectId);
      setThreads(data);
      if (onThreadsLoaded) onThreadsLoaded(data);
    } catch (err) {
      console.error("Failed to load project threads:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, onThreadsLoaded]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads, refreshTrigger]);

  // Handle delete update item
  const handleDeleteThread = async (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    await deleteProjectThread(projectId, threadId);
  };

  // Handle add update item (Bottom Composer)
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = inputTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    const source = inputSourceUrl.trim() || null;

    const newItemPayload = {
      project_id: projectId,
      type: "news" as const,
      title: title,
      content: null,
      source_url: source,
      status: "info" as const,
      completed_at: null,
    };

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
      console.error("Failed to add update:", err);
      setThreads((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  // Extract raw original telegram post text
  const originalTelegramPost = useMemo(
    () => extractOriginalTelegramText(guideContent, socialLinks),
    [guideContent, socialLinks]
  );

  const channelInfo = useMemo(
    () => getChannelSource(socialLinks, guideContent),
    [socialLinks, guideContent]
  );

  // Translation Action Info (computed based on user's system locale)
  const postTranslationAction = useMemo(() => {
    if (!originalTelegramPost) return null;
    return getTranslationAction(originalTelegramPost, locale, showTranslated);
  }, [originalTelegramPost, locale, showTranslated]);

  // Translate Original Post on Demand
  const handleTranslateOriginalPost = async () => {
    if (!originalTelegramPost) return;

    if (translatedText) {
      setShowTranslated(!showTranslated);
      return;
    }

    setIsTranslating(true);
    try {
      const action = getTranslationAction(originalTelegramPost, locale, false);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalTelegramPost,
          targetLang: action.targetLang,
          sourceLang: action.sourceLang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.translatedText) {
        setTranslatedText(json.data.translatedText);
        setShowTranslated(true);
      }
    } catch (err) {
      console.error("Failed to translate post:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const totalNews = threads.length;

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. HEADER SECTION: Title & Actions                      */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shadow-lg shadow-accent/10">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary tracking-tight">
                Linimasa Garapan & Update
              </h2>
              <p className="text-caption text-text-secondary mt-0.5">
                Postingan asli panduan garapan dan kabar terbaru proyek secara kronologis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenTelegramSearch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-link-teal/10 border border-link-teal/30 hover:border-link-teal/60 text-link-teal hover:bg-link-teal/20 text-caption font-semibold transition-all shadow-xs"
              title="Cari update tentang proyek ini di Telegram (Duta Crypto & Airdrop Finder)"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Cek Update TG</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-caption font-medium transition-all shrink-0 ${
              filter === "all"
                ? "bg-white/[0.08] text-text-primary border border-white/[0.2] font-semibold shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            Semua Alur ({1 + threads.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("news")}
            className={`px-3 py-1 rounded-lg text-caption font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              filter === "news"
                ? "bg-link-teal/20 text-link-teal border border-link-teal/40 font-semibold shadow-xs"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>📢 Update Info ({totalNews})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TIMELINE FEED (100% CENTERED FLEX COLUMN SPINE)       */}
      {/* ======================================================== */}
      <div className="space-y-6">
        
        {/* POST INDUK AIRDROP (Postingan Asli Telegram) */}
        <div className="flex items-start gap-4 sm:gap-5 group animate-fade-in">
          {/* Kolom Kiri: Logo Bulat & Garis Vertikal Sumbu 100% Center */}
          <div className="flex flex-col items-center shrink-0 self-stretch relative w-10 sm:w-11">
            {/* Logo Channel Bulat */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-4 ring-[#07090e] border-2 border-amber-500/40 bg-[#0c1017] flex items-center justify-center shadow-xl shadow-black/80 shrink-0 z-10 mt-1">
              {channelInfo.logo ? (
                <Image
                  src={channelInfo.logo}
                  alt={channelInfo.name}
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Send className="w-4 h-4 text-accent" />
              )}
            </div>

            {/* Garis Vertikal Linimasa: Menembus ke Bawah, Selalu 100% Center */}
            {threads.length > 0 && (
              <div className="w-[2px] flex-1 bg-gradient-to-b from-amber-400/60 via-white/[0.12] to-link-teal/40 my-2" />
            )}
          </div>

          {/* Kolom Kanan: Main Post Card Container */}
          <div className="flex-1 min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 shadow-xl shadow-black/20 space-y-3.5">
            {/* Header: Channel info & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-bold text-text-primary">
                  {channelInfo.name}
                </span>
                <span className="text-[12px] font-mono text-text-tertiary">
                  {channelInfo.handle}
                </span>
                <span className="text-white/20 text-caption">•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/30 flex items-center gap-1 shadow-xs">
                  <Pin className="w-2.5 h-2.5" />
                  <span>Post Utama</span>
                </span>
                {projectCreatedAt && (
                  <>
                    <span className="text-white/20 text-caption">•</span>
                    <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-tertiary/70" />
                      <span>{formatTime(projectCreatedAt)}</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Translate Button - Only shown if post language is opposite to system language */}
                {postTranslationAction?.shouldShowTranslate && (
                  <button
                    type="button"
                    onClick={handleTranslateOriginalPost}
                    disabled={isTranslating}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-medium transition-all ${
                      showTranslated
                        ? "bg-status-completed/20 text-status-completed border border-status-completed/40"
                        : "bg-white/[0.03] text-text-secondary hover:text-text-primary border border-white/[0.08]"
                    }`}
                    title="Terjemahkan teks postingan"
                  >
                    <Languages className={`w-3 h-3 ${isTranslating ? "animate-spin text-accent" : ""}`} />
                    <span>
                      {isTranslating
                        ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                        : showTranslated
                        ? postTranslationAction.revertLabel
                        : postTranslationAction.buttonLabel}
                    </span>
                  </button>
                )}

                {socialLinks?.telegram_post_url && (
                  <a
                    href={socialLinks.telegram_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-link-teal hover:underline font-medium"
                  >
                    <Send className="w-3 h-3" />
                    <span>Buka di TG</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
              </div>
            </div>

            {/* POSTINGAN ASLI SUMBER (Full Readable Content - NO CHECKBOXES) */}
            {originalTelegramPost ? (
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-body-sm text-text-secondary leading-relaxed whitespace-pre-line break-words font-sans selection:bg-accent/30 selection:text-white space-y-2">
                {showTranslated && translatedText && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-completed/10 border border-status-completed/20 text-[10.5px] font-medium text-status-completed w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-completed animate-pulse" />
                    <span>{locale === "id" ? "Diterjemahkan ke Bahasa Indonesia" : "Translated to English"}</span>
                  </div>
                )}
                <div>
                  {showTranslated && translatedText
                    ? renderInteractivePostText(translatedText)
                    : renderInteractivePostText(originalTelegramPost)}
                </div>
              </div>
            ) : (
              <p className="text-caption text-text-tertiary italic p-3 text-center">
                Belum ada teks panduan atau postingan asli untuk proyek ini.
              </p>
            )}
          </div>
        </div>

        {/* POSTINGAN LANJUTAN (Update Telegram & Catatan Tambahan) */}
        {threads.map((item, idx) => {
          const isLast = idx === threads.length - 1;
          const cleanTitle = cleanHtmlEntities(item.title);
          const cleanContent = cleanHtmlEntities(item.content || "");
          const hasExtraContent = cleanContent && cleanContent.trim() !== cleanTitle.trim();

          return (
            <div key={item.id} className="flex items-start gap-4 sm:gap-5 group animate-fade-in">
              {/* Kolom Kiri: Icon Node & Garis Vertikal Sumbu 100% Center */}
              <div className="flex flex-col items-center shrink-0 self-stretch relative w-10 sm:w-11">
                {/* Node Update Icon */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-link-teal/50 bg-[#0c1017] ring-4 ring-[#07090e] flex items-center justify-center text-link-teal shadow-xl shadow-black/80 shrink-0 z-10 mt-1">
                  <Newspaper className="w-4 h-4" />
                </div>

                {/* Garis Vertikal ke bawah jika ada update berikutnya */}
                {!isLast && (
                  <div className="w-[2px] flex-1 bg-gradient-to-b from-link-teal/40 via-white/[0.12] to-transparent my-2" />
                )}
              </div>

              {/* Kolom Kanan: Update Card Container */}
              <div className="flex-1 min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.2] transition-all duration-200 shadow-xl shadow-black/20 space-y-2.5">
                {/* Header: Badge, Timestamp, Source Link, Delete */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-link-teal/20 text-link-teal border border-link-teal/30 flex items-center gap-1 shadow-xs">
                      <Newspaper className="w-2.5 h-2.5" />
                      <span>Update Info</span>
                    </span>

                    <span className="text-white/20 text-caption">•</span>
                    <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-tertiary/70" />
                      <span>{formatTime(item.created_at)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-link-teal hover:underline font-medium"
                      >
                        <span>Sumber</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteThread(item.id)}
                      className="p-1 rounded text-text-tertiary hover:text-status-danger hover:bg-white/[0.05] transition-colors"
                      title="Hapus catatan update ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="text-body-sm text-text-primary font-medium leading-relaxed">
                    {renderInteractivePostText(cleanTitle)}
                  </div>

                  {hasExtraContent && (
                    <div className="text-body-sm text-text-secondary leading-relaxed whitespace-pre-line p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      {renderInteractivePostText(cleanContent)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. INPUT COMPOSER: Kirim Catatan & Cek Update TG         */}
      {/* ======================================================== */}
      <form
        onSubmit={handleAddUpdate}
        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] focus-within:border-accent/50 space-y-3 shadow-xl shadow-black/20"
      >
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
          <span className="text-caption font-semibold text-text-secondary flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-link-teal" />
            <span>Tambah Catatan / Pembaruan Proyek</span>
          </span>

          <button
            type="button"
            onClick={() => setShowSourceInput(!showSourceInput)}
            className={`text-caption inline-flex items-center gap-1 transition-colors ${
              showSourceInput || inputSourceUrl
                ? "text-link-teal font-medium"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{inputSourceUrl ? "Link Terpasang" : "+ Link Sumber (Opsional)"}</span>
          </button>
        </div>

        {/* Source URL input if toggled */}
        {showSourceInput && (
          <input
            type="url"
            value={inputSourceUrl}
            onChange={(e) => setInputSourceUrl(e.target.value)}
            placeholder="https://t.me/... atau link pengumuman resmi..."
            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-link-teal/50"
          />
        )}

        {/* Text Input, Cek Update TG Button, & Submit Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder={`Tulis catatan atau info update baru untuk ${projectName}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.05] transition-all"
          />

          <div className="flex items-center gap-2">
            {/* Tombol Cek Update Telegram persis di sebelah tombol Tambah */}
            <button
              type="button"
              onClick={onOpenTelegramSearch}
              className="px-3.5 py-2.5 rounded-xl bg-link-teal/15 text-link-teal border border-link-teal/30 hover:bg-link-teal/25 font-semibold text-caption transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
              title="Cek update Telegram terbaru untuk proyek ini"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cek Update TG</span>
              <span className="sm:hidden">Update TG</span>
            </button>

            {/* Tombol Submit Simpan Catatan */}
            <button
              type="submit"
              disabled={!inputTitle.trim() || isSubmitting}
              className="px-4 py-2.5 rounded-xl font-semibold text-caption bg-accent text-on-accent hover:bg-accent-pressed disabled:opacity-40 transition-all shrink-0 shadow-lg shadow-accent/20"
            >
              + Simpan Catatan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
