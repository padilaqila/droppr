"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import {
  Rss,
  RefreshCw,
  Search,
  ExternalLink,
  Send,
  Trash2,
  FolderPlus,
  Clock,
  Zap,
  Flame,
  Wallet,
  Coins,
  Check,
  AlertCircle,
  X,
  BookOpen,
  Copy,
  Sparkles,
  Layers2,
  Languages,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  fetchAirdropFeeds,
  deleteAirdropFeed,
  cleanupExpiredFeeds,
  type AirdropFeedItem,
} from "@/lib/supabase/airdrop-feeds";
import { ProjectReviewModal } from "@/components/features/project-review-modal";
import { useTranslation } from "@/lib/i18n/context";
import { getTranslationAction } from "@/lib/utils/language-prefs";
import { cleanDuplicateLinks } from "@/lib/utils/clean-links";

interface FeedClientViewProps {
  initialFeeds: AirdropFeedItem[];
}

// Channel logo & identity metadata
export function getChannelInfo(channelId: string) {
  if (channelId === "dutacryptoairdrop") {
    return {
      name: "Duta Crypto Airdrop",
      handle: "@dutacryptoairdrop",
      logo: "/images/credits/dutacrypto.webp",
      url: "https://t.me/dutacryptoairdrop",
    };
  }
  if (channelId === "airdropfind") {
    return {
      name: "Airdrop Finder",
      handle: "@airdropfind",
      logo: "/images/credits/airdropfinder.webp",
      url: "https://t.me/airdropfind",
    };
  }
  return {
    name: channelId,
    handle: `@${channelId}`,
    logo: null,
    url: `https://t.me/${channelId}`,
  };
}

// Pure helper detection for Free vs Paid Airdrop
export function isFeedFree(feed: AirdropFeedItem): boolean {
  const costLower = (feed.cost || "").toLowerCase();
  const categoryLower = (feed.category || "").toLowerCase();
  if (categoryLower === "testnet" || categoryLower === "waitlist") return true;
  if (
    costLower.includes("gratis") ||
    costLower.includes("free") ||
    costLower === "$0" ||
    costLower === "0" ||
    costLower.includes("testnet") ||
    costLower.includes("faucet")
  ) {
    return true;
  }
  return false;
}

export function isFeedPaid(feed: AirdropFeedItem): boolean {
  const costLower = (feed.cost || "").toLowerCase();
  const categoryLower = (feed.category || "").toLowerCase();
  if (categoryLower === "retro") return true;
  if (
    costLower.includes("$") ||
    costLower.includes("fee") ||
    costLower.includes("gas") ||
    costLower.includes("depo") ||
    costLower.includes("eth") ||
    costLower.includes("sol") ||
    costLower.includes("modal") ||
    costLower.includes("retro") ||
    costLower.includes("mainnet") ||
    costLower.includes("berbayar")
  ) {
    return true;
  }
  return !isFeedFree(feed);
}

// Extracts core project name for intelligent grouping and mention counting
export function extractCoreProjectKey(title: string): string {
  return title
    .replace(/^(TESTNET|AIRDROP|FREE|NEW AIRDROPS?|NEW TESTNET|NEW WAITLIST|UPDATE|REMINDER|CLAIM)\s*[:|-]?\s*/i, "")
    .replace(/\s*[|\-–—].*$/, "")
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)[0]
    .toLowerCase()
    .trim();
}

// Human readable relative timestamp (WIB localized / i18n aware)
export function formatTimeAgo(isoString?: string | null, locale: "id" | "en" = "id"): string {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return locale === "en" ? "Just now" : "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return locale === "en" ? `${diffMin}m ago` : `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return locale === "en" ? `${diffHours}h ago` : `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return locale === "en" ? "Yesterday" : "Kemarin";
    if (diffDays < 7) return locale === "en" ? `${diffDays}d ago` : `${diffDays} hari lalu`;
    return new Date(isoString).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

// Render raw telegram text with interactive links in preview modal, deduplicating duplicate URLs
function renderInteractiveText(text: string) {
  const cleanText = cleanDuplicateLinks(text);
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(cleanText)) !== null) {
    if (match.index > lastIndex) {
      elements.push(cleanText.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
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
      let rawUrl = match[3];
      let trailingPunct = "";
      const punctMatch = rawUrl.match(/([.,;:!?)\]]+)$/);
      if (punctMatch) {
        trailingPunct = punctMatch[1];
        rawUrl = rawUrl.slice(0, -trailingPunct.length);
      }

      elements.push(
        <a
          key={`url-${match.index}`}
          href={rawUrl}
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 inline-flex items-center gap-1 font-mono text-[12px] transition-colors break-all"
        >
          <span>{rawUrl}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );

      if (trailingPunct) {
        elements.push(trailingPunct);
      }
    }

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < cleanText.length) {
    elements.push(cleanText.slice(lastIndex));
  }

  return elements;
}

export function FeedClientView({ initialFeeds }: FeedClientViewProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [feeds, setFeeds] = useState<AirdropFeedItem[]>(initialFeeds);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [channelFilter, setChannelFilter] = useState<"all" | "dutacryptoairdrop" | "airdropfind">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "testnet" | "retro">("all");
  const [costFilter, setCostFilter] = useState<"all" | "free" | "paid">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [timeRange, setTimeRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [reviewingFeed, setReviewingFeed] = useState<AirdropFeedItem | null>(null);

  // Telegram original post preview modal state & manual on-demand translation
  const [previewingFeed, setPreviewingFeed] = useState<AirdropFeedItem | null>(null);
  const [isPreviewCopied, setIsPreviewCopied] = useState(false);
  const [isPreviewTranslating, setIsPreviewTranslating] = useState(false);
  const [previewTranslatedText, setPreviewTranslatedText] = useState<string | null>(null);
  const [showPreviewTranslated, setShowPreviewTranslated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when preview modal is open
  useEffect(() => {
    if (previewingFeed) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [previewingFeed]);

  const handleOpenPreview = (feed: AirdropFeedItem) => {
    setPreviewingFeed(feed);
    setPreviewTranslatedText(null);
    setShowPreviewTranslated(false);
    setIsPreviewTranslating(false);
    setIsPreviewCopied(false);
  };

  const handleClosePreview = () => {
    setPreviewingFeed(null);
    setPreviewTranslatedText(null);
    setShowPreviewTranslated(false);
    setIsPreviewTranslating(false);
    setIsPreviewCopied(false);
  };

  const handleTranslatePreview = async () => {
    if (!previewingFeed) return;
    if (previewTranslatedText) {
      setShowPreviewTranslated(!showPreviewTranslated);
      return;
    }

    setIsPreviewTranslating(true);
    try {
      const cleanRaw = cleanDuplicateLinks(previewingFeed.raw_text);
      const action = getTranslationAction(cleanRaw, locale, false);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanRaw,
          targetLang: action.targetLang,
          sourceLang: action.sourceLang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.translatedText) {
        setPreviewTranslatedText(json.data.translatedText);
        setShowPreviewTranslated(true);
      }
    } catch (err) {
      console.error("Gagal menerjemahkan postingan feed:", err);
    } finally {
      setIsPreviewTranslating(false);
    }
  };



  // Sync feed from Telegram
  const handleSyncFeed = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus("Memindai postingan airdrop baru dari Telegram...");

    try {
      const res = await fetch("/api/feed/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyinkronkan feed.");
      }

      setSyncStatus(`Sinkronisasi selesai! ${data.insertedCount || 0} postingan baru ditambahkan.`);
      
      // Reload feeds directly from database to update UI immediately
      const updated = await fetchAirdropFeeds();
      setFeeds(updated);
      router.refresh();

      setTimeout(() => {
        setSyncStatus(null);
      }, 4000);
    } catch (err: any) {
      console.error("Sync feed error:", err);
      setSyncStatus(err?.message || "Terjadi kesalahan saat sinkronisasi.");
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Cleanup feeds older than 30 days
  const handleCleanupExpired = async () => {
    if (!window.confirm("Hapus semua postingan feed yang sudah lebih dari 1 bulan?")) return;
    try {
      const count = await cleanupExpiredFeeds();
      alert(`${count} postingan kadaluarsa berhasil dibersihkan.`);
      const updated = await fetchAirdropFeeds();
      setFeeds(updated);
      router.refresh();
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  };

  // Calculate mention frequency per project key across all feeds
  const projectMentionStats = useMemo(() => {
    const stats: Record<string, { count: number; titles: string[] }> = {};
    feeds.forEach((f) => {
      const key = extractCoreProjectKey(f.title);
      if (!key) return;
      if (!stats[key]) {
        stats[key] = { count: 0, titles: [] };
      }
      stats[key].count += 1;
      if (!stats[key].titles.includes(f.title)) {
        stats[key].titles.push(f.title);
      }
    });
    return stats;
  }, [feeds]);

  // Delete individual feed item
  const handleDeleteFeed = async (feedId: string) => {
    if (!window.confirm(t("feed.confirmDeleteFeed") || (locale === "en" ? "Delete this airdrop post from your feed?" : "Hapus postingan sinyal airdrop ini dari feed?"))) {
      return;
    }
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    await deleteAirdropFeed(feedId);
  };

  // Filtered feeds logic (Testnet vs Retro vs Waitlist, Free vs Paid, Time Range & Sort)
  const filteredFeeds = useMemo(() => {
    return feeds
      .filter((feed) => {
        // Channel filter
        if (channelFilter !== "all" && feed.channel !== channelFilter) {
          return false;
        }

        // Category filter (Testnet, Retro/Mainnet, Waitlist)
        if (categoryFilter !== "all") {
          if (categoryFilter === "testnet") {
            const isTestnet =
              feed.category === "testnet" ||
              feed.title.toLowerCase().includes("testnet") ||
              (!isFeedPaid(feed) && feed.category !== "waitlist");
            if (!isTestnet) return false;
          } else if (categoryFilter === "retro") {
            const isRetro = feed.category === "retro" || isFeedPaid(feed);
            if (!isRetro) return false;
          }
        }

        // Cost filter (Gratis vs Berbayar)
        if (costFilter === "free") {
          if (!isFeedFree(feed)) return false;
        } else if (costFilter === "paid") {
          if (!isFeedPaid(feed)) return false;
        }

        // Time Range filter
        if (timeRange !== "all") {
          const now = Date.now();
          const itemTime = new Date(feed.created_at).getTime();
          if (!isNaN(itemTime)) {
            const diffMs = now - itemTime;
            if (timeRange === "24h" && diffMs > 24 * 60 * 60 * 1000) return false;
            if (timeRange === "7d" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
            if (timeRange === "30d" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = feed.title.toLowerCase().includes(q);
          const matchSummary = (feed.summary || "").toLowerCase().includes(q);
          const matchRaw = feed.raw_text.toLowerCase().includes(q);
          if (!matchTitle && !matchSummary && !matchRaw) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [feeds, channelFilter, categoryFilter, costFilter, timeRange, sortOrder, searchQuery]);

  // Feeds to display
  const displayedFeeds = filteredFeeds;

  // Counts for category badges
  const testnetCount = useMemo(
    () => feeds.filter((f) => f.category === "testnet" || !isFeedPaid(f)).length,
    [feeds]
  );
  const retroCount = useMemo(
    () => feeds.filter((f) => f.category === "retro" || isFeedPaid(f)).length,
    [feeds]
  );
  const freeCostCount = useMemo(() => feeds.filter((f) => isFeedFree(f)).length, [feeds]);
  const paidCostCount = useMemo(() => feeds.filter((f) => isFeedPaid(f)).length, [feeds]);

  return (
    <div className="w-full space-y-6 min-w-0 pb-16 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shadow-lg shadow-accent/10">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-heading-2 font-bold text-text-primary tracking-tight flex items-center gap-2">
                <span>{t("feed.title")}</span>
              </h1>
              <p className="text-body-sm text-text-secondary mt-0.5">
                {t("feed.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <ButtonSecondary
            onClick={handleCleanupExpired}
            className="!py-2 !px-3.5 text-caption text-text-tertiary hover:text-text-primary bg-white/[0.03] backdrop-blur-md border-white/[0.08] hover:border-white/[0.2] transition-all rounded-xl"
            title="Bersihkan postingan lama yang sudah melebihi 30 hari"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>{t("feed.cleanOldPosts")}</span>
          </ButtonSecondary>

          <ButtonPrimary
            onClick={handleSyncFeed}
            disabled={isSyncing}
            className="!py-2 !px-4 text-body-sm inline-flex items-center gap-2 rounded-xl shadow-lg shadow-accent/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? t("feed.syncing") : t("feed.syncButton")}</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* SYNC NOTIFICATION BANNER */}
      {syncStatus && (
        <div className="p-3.5 rounded-xl bg-accent/10 backdrop-blur-md border border-accent/25 text-accent text-body-sm flex items-center justify-between shadow-lg shadow-accent/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0 animate-pulse" />
            <span>{syncStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="text-caption hover:underline text-text-tertiary hover:text-text-primary ml-2 shrink-0"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {/* ERROR ALERT BANNER */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-status-danger/15 backdrop-blur-md border border-status-danger/30 text-status-danger text-body-sm flex items-center justify-between gap-2 shadow-lg shadow-status-danger/10">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-lg hover:bg-status-danger/20 text-status-danger transition-colors shrink-0"
            title={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER CONTROLS BAR (Liquid Frosted Glass) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Channel Tabs */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setChannelFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all shrink-0 ${
                channelFilter === "all"
                  ? "bg-accent/20 text-accent font-semibold border border-accent/30 shadow-xs"
                  : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.allChannels")}
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("dutacryptoairdrop")}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all flex items-center gap-2 shrink-0 ${
                channelFilter === "dutacryptoairdrop"
                  ? "bg-accent/20 text-accent font-semibold border border-accent/30 shadow-xs"
                  : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-white/20">
                <Image
                  src="/images/credits/dutacrypto.webp"
                  alt="Duta Crypto"
                  width={16}
                  height={16}
                  className="w-full h-full object-cover"
                />
              </div>
              <span>Duta Crypto</span>
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("airdropfind")}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all flex items-center gap-2 shrink-0 ${
                channelFilter === "airdropfind"
                  ? "bg-link-teal/20 text-link-teal font-semibold border border-link-teal/30 shadow-xs"
                  : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-white/20">
                <Image
                  src="/images/credits/airdropfinder.webp"
                  alt="Airdrop Finder"
                  width={16}
                  height={16}
                  className="w-full h-full object-cover"
                />
              </div>
              <span>Airdrop Finder</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("feed.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        {/* Tipe Garapan & Biaya Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-caption">
          {/* Tipe Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1">
              {t("feed.categoryLabel")}
            </span>

            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                categoryFilter === "all"
                  ? "bg-white/[0.08] text-text-primary border-white/[0.18] font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.all")} ({feeds.length})
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("testnet")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                categoryFilter === "testnet"
                  ? "bg-link-teal/20 text-link-teal border-link-teal/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Zap className="w-3 h-3 text-link-teal" />
              <span>{t("feed.testnet")} ({testnetCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("retro")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                categoryFilter === "retro"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span>{t("feed.retro")} ({retroCount})</span>
            </button>
          </div>

          {/* Biaya Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1">
              {t("feed.costLabel")}
            </span>

            <button
              type="button"
              onClick={() => setCostFilter("all")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                costFilter === "all"
                  ? "bg-white/[0.08] text-text-primary border-white/[0.18] font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.all")}
            </button>

            <button
              type="button"
              onClick={() => setCostFilter("free")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                costFilter === "free"
                  ? "bg-status-completed/20 text-status-completed border-status-completed/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Coins className="w-3 h-3 text-status-completed" />
              <span>{t("feed.free")} ({freeCostCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCostFilter("paid")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                costFilter === "paid"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Wallet className="w-3 h-3 text-amber-400" />
              <span>{t("feed.paid")} ({paidCostCount})</span>
            </button>
          </div>
        </div>

        {/* Rentang Waktu & Urutan (Menurun / Menanjak) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-caption">
          {/* Rentang Waktu Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-text-tertiary" />
              <span>{t("feed.timeLabel")}</span>
            </span>

            <button
              type="button"
              onClick={() => setTimeRange("all")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                timeRange === "all"
                  ? "bg-white/[0.08] text-text-primary border-white/[0.18] font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.timeAll")}
            </button>

            <button
              type="button"
              onClick={() => setTimeRange("24h")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                timeRange === "24h"
                  ? "bg-accent/20 text-accent border-accent/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.time24h")}
            </button>

            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                timeRange === "7d"
                  ? "bg-accent/20 text-accent border-accent/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.time7d")}
            </button>

            <button
              type="button"
              onClick={() => setTimeRange("30d")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                timeRange === "30d"
                  ? "bg-accent/20 text-accent border-accent/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t("feed.time30d")}
            </button>
          </div>

          {/* Urutan Waktu (Menurun / Menanjak) */}
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-text-tertiary" />
              <span>{t("feed.sortLabel")}</span>
            </span>

            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={`px-2.5 py-1 rounded-md text-caption font-medium transition-all flex items-center gap-1.5 ${
                  sortOrder === "desc"
                    ? "bg-accent/20 text-accent font-semibold shadow-xs"
                    : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
                }`}
                title={locale === "en" ? "Newest posts first (Descending)" : "Postingan paling baru dulu (Menurun)"}
              >
                <ArrowDown className="w-3 h-3" />
                <span>{t("feed.sortNewest")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={`px-2.5 py-1 rounded-md text-caption font-medium transition-all flex items-center gap-1.5 ${
                  sortOrder === "asc"
                    ? "bg-accent/20 text-accent font-semibold shadow-xs"
                    : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
                }`}
                title={locale === "en" ? "Oldest posts first (Ascending)" : "Postingan paling lama dulu (Menanjak)"}
              >
                <ArrowUp className="w-3 h-3" />
                <span>{t("feed.sortOldest")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEED STREAM CONTAINER (Liquid Frosted Glass Telegram Message Style) */}
      <div className="space-y-4">
        {displayedFeeds.length === 0 ? (
          <div className="p-12 text-center space-y-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20">
            <Rss className="w-9 h-9 text-text-tertiary mx-auto opacity-50" />
            <h3 className="text-body-md font-semibold text-text-primary">
              {t("feed.noMatch")}
            </h3>
            <p className="text-caption text-text-secondary max-w-md mx-auto">
              {t("feed.noMatchDesc")}
            </p>
            <div className="pt-2">
              <ButtonPrimary onClick={handleSyncFeed} disabled={isSyncing} className="rounded-xl">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{t("feed.syncNow")}</span>
              </ButtonPrimary>
            </div>
          </div>
        ) : (
          displayedFeeds.map((feed) => {
            const channelInfo = getChannelInfo(feed.channel);
            const isConverted = feed.is_imported;
            const projectKey = extractCoreProjectKey(feed.title);
            const mentionCount = projectMentionStats[projectKey]?.count || 1;
            const relativeTime = formatTimeAgo(feed.created_at, locale);

            return (
              <div
                key={feed.id}
                className={`p-5 sm:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border transition-all duration-200 space-y-4 relative group shadow-xl shadow-black/20 ${
                  isConverted
                    ? "border-status-completed/30 bg-status-completed/[0.02]"
                    : "border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                {/* Header: Telegram Channel Avatar, Channel Name, Timestamp, Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Official Channel Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-white/[0.05] shrink-0 shadow-md flex items-center justify-center">
                      {channelInfo.logo ? (
                        <Image
                          src={channelInfo.logo}
                          alt={channelInfo.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Send className="w-4 h-4 text-accent" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-body-sm font-bold text-text-primary truncate">
                          {channelInfo.name}
                        </span>
                        <span className="text-[12px] font-mono text-text-tertiary">
                          {channelInfo.handle}
                        </span>
                        {relativeTime && (
                          <>
                            <span className="text-white/20 text-caption">•</span>
                            <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                              <Clock className="w-3 h-3 text-text-tertiary/70" />
                              <span>{relativeTime}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary/80 font-mono">
                        {t("feed.sourceTelegram")}
                      </p>
                    </div>
                  </div>

                  {/* Badges: Mention frequency & Category & Cost */}
                  <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                    {/* Mention Frequency Counter Badge */}
                    {mentionCount > 1 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1 shadow-xs"
                        title={`Proyek ini sudah disebut atau diperbarui ${mentionCount} kali di channel Telegram`}
                      >
                        <Layers2 className="w-3 h-3" />
                        <span>{mentionCount}x {t("feed.updateCountSuffix")}</span>
                      </span>
                    )}

                    {/* Cost Badge */}
                    {isFeedFree(feed) ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-status-completed/15 text-status-completed border border-status-completed/30 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        <span>{t("feed.free")}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        <span>{feed.cost || (locale === "en" ? "Gas Fee" : "Biaya Gas")}</span>
                      </span>
                    )}

                    {/* Category Badge */}
                    {feed.category === "retro" || isFeedPaid(feed) ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>{t("feed.retro")}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-link-teal/15 border border-link-teal/30 text-link-teal flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{t("feed.testnet")}</span>
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-text-tertiary hover:text-status-overdue rounded-lg hover:bg-white/[0.05] transition-colors ml-1"
                      title={t("feed.deleteFeedTooltip")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message Body: Title & Clean Summary (Klik nama untuk buka postingan asli) */}
                <div
                  onClick={() => handleOpenPreview(feed)}
                  className="space-y-2 cursor-pointer group/title focus:outline-none select-text"
                  title={locale === "id" ? "Klik untuk melihat postingan asli Telegram" : "Click to view original Telegram post"}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenPreview(feed);
                    }
                  }}
                >
                  <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary group-hover/title:text-accent transition-colors tracking-tight leading-snug">
                    {feed.title}
                  </h2>
                  {feed.summary ? (
                    <p className="text-body-sm text-text-secondary group-hover/title:text-text-primary/90 leading-relaxed line-clamp-3 transition-colors">
                      {feed.summary}
                    </p>
                  ) : (
                    <p className="text-caption text-text-tertiary line-clamp-2 italic">
                      {feed.raw_text.replace(/\n+/g, " ").slice(0, 160)}...
                    </p>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                  {/* Left: Project Creation Status or Button */}
                  <div className="flex items-center gap-2">
                    {isConverted ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-completed/15 text-status-completed border border-status-completed/30 text-caption font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>{t("feed.alreadyProject")}</span>
                        </span>

                        <Link
                          href={feed.linked_project_id ? `/projects/${feed.linked_project_id}` : "/projects"}
                          prefetch={false}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-primary border border-white/[0.1] text-caption font-medium transition-colors"
                        >
                          <span>{t("feed.openProject")}</span>
                          <ExternalLink className="w-3 h-3 text-text-tertiary" />
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewingFeed(feed)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed transition-all text-body-sm font-semibold shadow-lg shadow-accent/20"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>{t("feed.addProject")}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: View Original Post Modal, Check X, Open Telegram */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Original Post Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(feed)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-primary border border-white/[0.1] hover:border-white/[0.2] text-caption font-medium transition-all"
                      title="Lihat pesan asli Telegram lengkap dengan tautan aslinya"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-accent" />
                      <span>{t("feed.viewOriginal")}</span>
                    </button>

                    {/* Check on X / Twitter */}
                    <a
                      href={`https://x.com/search?q=${encodeURIComponent(
                        feed.title
                          .replace(/^(TESTNET|AIRDROP|FREE|NEW AIRDROPS?|NEW TESTNET|NEW WAITLIST|UPDATE)\s*[:|-]?\s*/i, "")
                          .trim()
                      )}+airdrop&f=live`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border border-white/[0.08] hover:border-white/[0.2] text-caption font-medium transition-all"
                      title="Cek sentimen & kabar proyek ini di X (Twitter)"
                    >
                      <Search className="w-3 h-3 text-text-tertiary" />
                      <span>{t("feed.checkX")}</span>
                    </a>

                    {/* Open in Telegram */}
                    <a
                      href={feed.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-link-teal hover:text-link-teal/90 border border-white/[0.08] hover:border-white/[0.2] text-caption font-medium transition-all"
                      title="Buka langsung di aplikasi atau web Telegram"
                    >
                      <Send className="w-3 h-3" />
                      <span className="hidden sm:inline">{t("feed.openTelegram")}</span>
                      <span className="sm:hidden">TG</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* POPUP MODAL: LIHAT POSTINGAN ASLI TELEGRAM               */}
      {/* ======================================================== */}
      {previewingFeed && mounted && typeof document !== "undefined" && (() => {
        const previewAction = getTranslationAction(previewingFeed.raw_text, locale, showPreviewTranslated);
        return createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overscroll-contain animate-fade-in">
            {/* Full-screen Backdrop */}
            <div
              className="fixed inset-0 bg-[#07090E]/80 backdrop-blur-md transition-opacity"
              onClick={handleClosePreview}
            />

            <div
              className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-border-hairline flex items-center justify-between gap-3 shrink-0 bg-bg-elevated">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-border-hairline bg-bg-base shrink-0 flex items-center justify-center shadow-sm">
                    {getChannelInfo(previewingFeed.channel).logo ? (
                      <Image
                        src={getChannelInfo(previewingFeed.channel).logo!}
                        alt={previewingFeed.channel_name}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Send className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-body-md font-bold text-text-primary truncate">
                      {previewingFeed.title}
                    </h3>
                    <p className="text-[12px] font-mono text-text-tertiary">
                      {previewingFeed.channel_name} • {formatTimeAgo(previewingFeed.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Translate Button */}
                  {previewAction.shouldShowTranslate && (
                    <button
                      type="button"
                      onClick={handleTranslatePreview}
                      disabled={isPreviewTranslating}
                      className={`px-2.5 py-1.5 rounded-lg border text-caption font-medium transition-all flex items-center gap-1.5 ${
                        showPreviewTranslated
                          ? "bg-status-completed/20 text-status-completed border-status-completed/40"
                          : "bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border-border-hairline"
                      }`}
                      title="Terjemahkan teks postingan"
                    >
                      <Languages className={`w-3.5 h-3.5 ${isPreviewTranslating ? "animate-spin text-accent" : ""}`} />
                      <span>
                        {isPreviewTranslating
                          ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                          : showPreviewTranslated
                          ? previewAction.revertLabel
                          : previewAction.buttonLabel}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const raw = showPreviewTranslated && previewTranslatedText ? previewTranslatedText : previewingFeed.raw_text;
                      const textToCopy = cleanDuplicateLinks(raw);
                      navigator.clipboard.writeText(textToCopy);
                      setIsPreviewCopied(true);
                      setTimeout(() => setIsPreviewCopied(false), 2500);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border border-border-hairline text-caption font-medium transition-all flex items-center gap-1.5"
                    title="Salin teks postingan Telegram"
                  >
                    {isPreviewCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-status-completed" />
                        <span className="text-status-completed">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t("common.copy")}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-3 no-scrollbar bg-bg-elevated">
                {showPreviewTranslated && previewTranslatedText && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-completed/10 border border-status-completed/25 text-[11px] font-medium text-status-completed w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-completed animate-pulse" />
                    <span>
                      {locale === "id"
                        ? "Diterjemahkan ke Bahasa Indonesia"
                        : "Translated to English"}
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-bg-base border border-border-hairline text-body-sm text-text-primary leading-relaxed whitespace-pre-line break-words font-sans selection:bg-accent/30 selection:text-text-primary">
                  {renderInteractiveText(
                    showPreviewTranslated && previewTranslatedText
                      ? previewTranslatedText
                      : previewingFeed.raw_text
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-border-hairline bg-bg-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
                <a
                  href={previewingFeed.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-link-teal text-caption font-medium border border-border-hairline transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("feed.openTelegram")}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="px-4 py-2 rounded-xl text-caption text-text-secondary hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all font-medium"
                  >
                    {t("common.close")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = previewingFeed;
                      handleClosePreview();
                      setReviewingFeed(item);
                    }}
                    className="px-4 py-2 rounded-xl text-caption font-semibold text-on-accent bg-accent hover:bg-accent-pressed transition-all shadow-lg shadow-accent/20 flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{t("feed.makeProject")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ======================================================== */}
      {/* REVIEW & BUAT PROYEK MODAL                               */}
      {/* ======================================================== */}
      <ProjectReviewModal
        isOpen={Boolean(reviewingFeed)}
        onClose={() => setReviewingFeed(null)}
        source="feed"
        feedItem={reviewingFeed}
        onSuccess={(newProjectId) => {
          if (reviewingFeed) {
            setFeeds((prev) =>
              prev.map((f) =>
                f.id === reviewingFeed.id
                  ? { ...f, is_imported: true, linked_project_id: newProjectId }
                  : f
              )
            );
          }
          setReviewingFeed(null);
          router.push(`/projects/${newProjectId}`);
        }}
      />
    </div>
  );
}
