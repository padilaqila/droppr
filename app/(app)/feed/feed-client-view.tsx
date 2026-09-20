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
  Hourglass,
  Zap,
  Flame,
  Gift,
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCw,
  History,
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
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal, type ConfirmModalState } from "@/components/ui/confirm-modal";

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
  if (categoryLower === "testnet" || categoryLower === "airdrop") return true;
  if (
    costLower.includes("gratis") ||
    costLower.includes("free") ||
    costLower === "$0" ||
    costLower === "0" ||
    /^\$?0(\.0+)?$/.test(costLower.trim()) ||
    costLower.includes("testnet") ||
    costLower.includes("faucet")
  ) {
    return true;
  }
  // Default to free if no cost is specified and not explicitly retro
  if (!feed.cost && categoryLower !== "retro") return true;
  return false;
}

export function isFeedPaid(feed: AirdropFeedItem): boolean {
  const costLower = (feed.cost || "").toLowerCase();
  const categoryLower = (feed.category || "").toLowerCase();
  if (categoryLower === "retro") return true;

  // If already confirmed free, it cannot be paid
  if (isFeedFree(feed)) return false;

  const hasPaidDollar = /\$(?!0(\.0+)?(\s|$|\)))[0-9]+/.test(costLower);
  if (
    hasPaidDollar ||
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
  return false;
}

export function isFeedTestnet(feed: AirdropFeedItem): boolean {
  if (feed.category === "testnet") return true;
  const t = (feed.title || "").toLowerCase();
  const raw = (feed.raw_text || "").toLowerCase();
  return t.includes("testnet") || raw.includes("testnet") || raw.includes("faucet") || raw.includes("sepolia");
}

export function isFeedRetro(feed: AirdropFeedItem): boolean {
  if (feed.category === "retro") return true;
  if (isFeedTestnet(feed)) return false;
  return isFeedPaid(feed);
}

export function isFeedAirdrop(feed: AirdropFeedItem): boolean {
  if (feed.category === "airdrop") return true;
  return !isFeedTestnet(feed) && !isFeedRetro(feed);
}

export function isFeedPotential(feed: AirdropFeedItem): boolean {
  return (
    /(?:📌\s*)?potential\s+airdrop/i.test(feed.raw_text || "") ||
    /potential\s+airdrop/i.test(feed.title || "")
  );
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

// Format full date & time (e.g. "20 Sep 2026, 18:45 WIB")
export function formatFullDate(isoString?: string | null, isEn: boolean = false): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return (
      d.toLocaleDateString(isEn ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
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
          className="text-link-teal hover:text-link-teal-pressed underline underline-offset-2 inline-flex items-center gap-1 font-medium transition-colors break-all"
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
          className="text-link-teal hover:text-link-teal-pressed underline underline-offset-2 inline-flex items-center gap-1 font-mono text-[12px] transition-colors break-all"
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
  const [categoryFilter, setCategoryFilter] = useState<"all" | "testnet" | "airdrop" | "retro">("all");
  const [costFilter, setCostFilter] = useState<"all" | "free" | "paid">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [timeRange, setTimeRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingWaitlistCount, setMatchingWaitlistCount] = useState<number | null>(null);

  const [reviewingFeed, setReviewingFeed] = useState<AirdropFeedItem | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    description: "",
  });

  // Telegram original post preview modal state & manual on-demand translation
  const [previewingFeed, setPreviewingFeed] = useState<AirdropFeedItem | null>(null);
  const [isPreviewCopied, setIsPreviewCopied] = useState(false);
  const [isPreviewTranslating, setIsPreviewTranslating] = useState(false);
  const [previewTranslatedText, setPreviewTranslatedText] = useState<string | null>(null);
  const [showPreviewTranslated, setShowPreviewTranslated] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Telegram live search & mention intelligence
  const [tgSearchResult, setTgSearchResult] = useState<{
    count: number;
    updates: any[];
    lastCheckedAt: Date;
  } | null>(null);
  const [isSearchingTg, setIsSearchingTg] = useState(false);
  const [showTgHistoryDrawer, setShowTgHistoryDrawer] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
      if (initialQuery) {
        setSearchQuery(initialQuery);
      }

      const handleGlobalSearch = (e: any) => {
        if (typeof e.detail?.query === "string") {
          setSearchQuery(e.detail.query);
        }
      };
      window.addEventListener("droppr-global-search" as any, handleGlobalSearch);
      return () => {
        window.removeEventListener("droppr-global-search" as any, handleGlobalSearch);
      };
    }
  }, []);

  // Automatically check if search query matches any items in Waitlists to guide the user
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setMatchingWaitlistCount(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from("waitlists")
          .select("id", { count: "exact", head: true })
          .or(`project_name.ilike.%${q}%,title.ilike.%${q}%`);
        if (!error && typeof count === "number") {
          setMatchingWaitlistCount(count);
        } else {
          setMatchingWaitlistCount(null);
        }
      } catch {
        setMatchingWaitlistCount(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("droppr-sync-search", { detail: { query: val } }));
    }
  };

  // Realtime Supabase synchronization + Tab Focus auto-refetch
  useEffect(() => {
    const supabase = createClient();

    // 1. Supabase Realtime channel for instant push updates when any user syncs
    const channel = supabase
      .channel("shared_airdrop_feeds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "airdrop_feeds" },
        async () => {
          try {
            const updated = await fetchAirdropFeeds();
            if (updated && updated.length > 0) {
              setFeeds(updated);
            }
          } catch (err) {
            console.warn("Realtime feed reload warning:", err);
          }
        }
      )
      .subscribe();

    // 2. Window focus & tab visibility change fallback (ensures fresh data after sleep/tab switch)
    let lastRefetch = Date.now();
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefetch > 20000) {
        lastRefetch = Date.now();
        try {
          const updated = await fetchAirdropFeeds();
          if (updated && updated.length > 0) {
            setFeeds(updated);
          }
        } catch (err) {
          console.warn("Tab focus feed reload warning:", err);
        }
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
    setShowTgHistoryDrawer(false);
  };

  const handleClosePreview = () => {
    setPreviewingFeed(null);
    setPreviewTranslatedText(null);
    setShowPreviewTranslated(false);
    setIsPreviewTranslating(false);
    setIsPreviewCopied(false);
    setShowTgHistoryDrawer(false);
    setTgSearchResult(null);
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
  const handleCleanupExpired = () => {
    setConfirmModal({
      isOpen: true,
      title: locale === "en" ? "Clean Up Expired Feeds" : "Bersihkan Postingan Kadaluarsa",
      description:
        locale === "en"
          ? "Delete all feed posts older than 30 days? Active projects will remain safe."
          : "Hapus semua postingan feed yang sudah lebih dari 1 bulan? Proyek yang sudah tersimpan akan tetap aman.",
      confirmLabel: locale === "en" ? "Clean Up" : "Bersihkan",
      variant: "danger",
      onConfirm: async () => {
        try {
          const count = await cleanupExpiredFeeds();
          const updated = await fetchAirdropFeeds();
          setFeeds(updated);
          router.refresh();
          setConfirmModal({
            isOpen: true,
            isAlert: true,
            title: locale === "en" ? "Cleanup Complete" : "Pembersihan Selesai",
            description:
              locale === "en"
                ? `${count} expired feed posts were successfully cleaned up.`
                : `${count} postingan kadaluarsa berhasil dibersihkan.`,
            variant: "success",
            confirmLabel: "OK",
          });
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      },
    });
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

  // Delete individual feed item (safeguarded: active projects cannot be deleted from feed)
  const handleDeleteFeed = (feed: AirdropFeedItem) => {
    if (feed.is_imported || feed.linked_project_id) {
      setConfirmModal({
        isOpen: true,
        isAlert: true,
        title: locale === "en" ? "Project Still Active" : "Proyek Masih Aktif",
        description:
          locale === "en"
            ? "This airdrop is already saved as an active project in your workspace.\n\nYou cannot delete it from the feed because the project still exists.\n\nTo remove this project, please delete it directly from the Projects page."
            : "Postingan airdrop ini sudah tersimpan sebagai Proyek aktif Anda.\n\nAnda tidak dapat menghapusnya langsung dari Feed karena proyek masih ada di direktori Proyek Anda.\n\nJika ingin menghapus garapan ini, silakan hapus langsung melalui halaman Proyek.",
        variant: "warning",
        confirmLabel: locale === "en" ? "Understood" : "Mengerti",
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: locale === "en" ? "Delete Feed Post" : "Hapus Postingan Feed",
      description:
        t("feed.confirmDeleteFeed") ||
        (locale === "en"
          ? "Delete this airdrop post from your feed?"
          : "Hapus postingan sinyal airdrop ini dari feed?"),
      confirmLabel: locale === "en" ? "Delete" : "Hapus",
      variant: "danger",
      onConfirm: async () => {
        setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
        await deleteAirdropFeed(feed.id);
      },
    });
  };

  // Filtered feeds logic (Testnet vs Retro vs Waitlist, Free vs Paid, Time Range & Sort)
  const filteredFeeds = useMemo(() => {
    return feeds
      .filter((feed) => {
        // Channel filter
        if (channelFilter !== "all" && feed.channel !== channelFilter) {
          return false;
        }

        // Category filter (Testnet, Airdrop, Retro)
        if (categoryFilter !== "all") {
          if (categoryFilter === "testnet" && !isFeedTestnet(feed)) return false;
          if (categoryFilter === "retro" && !isFeedRetro(feed)) return false;
          if (categoryFilter === "airdrop" && !isFeedAirdrop(feed)) return false;
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

  // Current preview index in displayed list
  const currentPreviewIndex = useMemo(() => {
    if (!previewingFeed) return -1;
    return filteredFeeds.findIndex((f) => f.id === previewingFeed.id);
  }, [previewingFeed, filteredFeeds]);

  const handleNextPreview = () => {
    if (currentPreviewIndex >= 0 && currentPreviewIndex < filteredFeeds.length - 1) {
      handleOpenPreview(filteredFeeds[currentPreviewIndex + 1]);
    }
  };

  const handlePrevPreview = () => {
    if (currentPreviewIndex > 0) {
      handleOpenPreview(filteredFeeds[currentPreviewIndex - 1]);
    }
  };

  const handleDeletePreview = (feed: AirdropFeedItem) => {
    if (feed.is_imported || feed.linked_project_id) {
      setConfirmModal({
        isOpen: true,
        isAlert: true,
        title: locale === "en" ? "Project Still Active" : "Proyek Masih Aktif",
        description:
          locale === "en"
            ? "This airdrop is already saved as an active project in your workspace.\n\nYou cannot delete it from the feed because the project still exists.\n\nTo remove this project, please delete it directly from the Projects page."
            : "Postingan airdrop ini sudah tersimpan sebagai Proyek aktif Anda.\n\nAnda tidak dapat menghapusnya langsung dari Feed karena proyek masih ada di direktori Proyek Anda.\n\nJika ingin menghapus garapan ini, silakan hapus langsung melalui halaman Proyek.",
        variant: "warning",
        confirmLabel: locale === "en" ? "Understood" : "Mengerti",
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: locale === "en" ? "Delete Feed Post" : "Hapus Postingan Feed",
      description:
        t("feed.confirmDeleteFeed") ||
        (locale === "en"
          ? "Delete this airdrop post from your feed?"
          : "Hapus postingan sinyal airdrop ini dari feed?"),
      confirmLabel: locale === "en" ? "Delete" : "Hapus",
      variant: "danger",
      onConfirm: async () => {
        const curIdx = filteredFeeds.findIndex((f) => f.id === feed.id);
        const remaining = filteredFeeds.filter((f) => f.id !== feed.id);
        setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
        await deleteAirdropFeed(feed.id);

        if (remaining.length === 0) {
          handleClosePreview();
        } else if (curIdx < remaining.length) {
          handleOpenPreview(remaining[curIdx]);
        } else {
          handleOpenPreview(remaining[remaining.length - 1]);
        }
      },
    });
  };

  // Keyboard navigation when preview modal is active
  useEffect(() => {
    if (!previewingFeed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPreview();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevPreview();
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleDeletePreview(previewingFeed);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClosePreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewingFeed, currentPreviewIndex, filteredFeeds]);

  // Project key for mention counting & intelligence
  const previewProjectKey = useMemo(() => {
    if (!previewingFeed) return "";
    return extractCoreProjectKey(previewingFeed.title);
  }, [previewingFeed]);

  // Local matching feeds from database
  const previewMatchingFeeds = useMemo(() => {
    if (!previewProjectKey) return [];
    return feeds
      .filter((f) => extractCoreProjectKey(f.title) === previewProjectKey)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [previewProjectKey, feeds]);

  // Combined timeline & mention stats
  const mentionTimeline = useMemo(() => {
    if (!previewingFeed) return null;
    const currentMs = new Date(previewingFeed.created_at).getTime();
    const timestamps = [
      currentMs,
      ...previewMatchingFeeds.map((f) => new Date(f.created_at).getTime()),
      ...(tgSearchResult?.updates || []).map((u: any) => new Date(u.date).getTime()),
    ].filter((t) => !isNaN(t));

    const earliestMs = timestamps.length > 0 ? Math.min(...timestamps) : currentMs;
    const latestMs = timestamps.length > 0 ? Math.max(...timestamps) : currentMs;
    const totalCount = Math.max(
      previewMatchingFeeds.length,
      (tgSearchResult?.updates?.length || 0),
      1
    );

    return {
      currentDate: previewingFeed.created_at,
      earliestDate: new Date(earliestMs).toISOString(),
      latestDate: new Date(latestMs).toISOString(),
      totalMentions: totalCount,
      feedCount: previewMatchingFeeds.length,
      tgCount: tgSearchResult?.count || 0,
    };
  }, [previewingFeed, previewMatchingFeeds, tgSearchResult]);

  // Automatic live Telegram update checker when preview changes
  useEffect(() => {
    if (!previewingFeed) {
      setTgSearchResult(null);
      setShowTgHistoryDrawer(false);
      return;
    }

    const key = extractCoreProjectKey(previewingFeed.title);
    if (!key || key.length < 2) return;

    let cancelled = false;
    setIsSearchingTg(true);
    fetch(`/api/telegram/search?q=${encodeURIComponent(key)}&channel=all`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) {
          setTgSearchResult({
            count: json.count || 0,
            updates: json.updates || [],
            lastCheckedAt: new Date(),
          });
        }
      })
      .catch((err) => console.error("Telegram search auto check error:", err))
      .finally(() => {
        if (!cancelled) setIsSearchingTg(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewingFeed?.id]);

  const handleRefreshTgUpdates = async () => {
    if (!previewingFeed) return;
    const key = extractCoreProjectKey(previewingFeed.title);
    if (!key) return;
    setIsSearchingTg(true);
    try {
      const res = await fetch(`/api/telegram/search?q=${encodeURIComponent(key)}&channel=all`);
      if (res.ok) {
        const json = await res.json();
        setTgSearchResult({
          count: json.count || 0,
          updates: json.updates || [],
          lastCheckedAt: new Date(),
        });
      }
    } catch (err) {
      console.error("Refresh telegram update error:", err);
    } finally {
      setIsSearchingTg(false);
    }
  };

  // Counts for category badges
  const testnetCount = useMemo(() => feeds.filter(isFeedTestnet).length, [feeds]);
  const airdropCount = useMemo(() => feeds.filter(isFeedAirdrop).length, [feeds]);
  const retroCount = useMemo(() => feeds.filter(isFeedRetro).length, [feeds]);
  const freeCostCount = useMemo(() => feeds.filter(isFeedFree).length, [feeds]);
  const paidCostCount = useMemo(() => feeds.filter(isFeedPaid).length, [feeds]);

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
              onChange={(e) => handleSearchChange(e.target.value)}
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
              onClick={() => setCategoryFilter("airdrop")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                categoryFilter === "airdrop"
                  ? "bg-status-waiting/20 text-status-waiting border-status-waiting/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Gift className="w-3 h-3 text-status-waiting" />
              <span>{t("feed.airdrop")} ({airdropCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("retro")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                categoryFilter === "retro"
                  ? "bg-badge-bg-ready-claim text-status-ready-claim border-status-ready-claim/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Flame className="w-3 h-3 text-accent" />
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
                  ? "bg-badge-bg-ready-claim text-status-ready-claim border-status-ready-claim/40 font-semibold"
                  : "border-transparent bg-white/[0.02] text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Wallet className="w-3 h-3 text-accent" />
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

      {/* SMART WAITLIST DIRECTIONAL BANNER */}
      {searchQuery.trim() && matchingWaitlistCount !== null && matchingWaitlistCount > 0 && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-purple-950/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-body-sm font-semibold text-text-primary">
                {locale === "en" ? (
                  <>Looking for &ldquo;{searchQuery}&rdquo;? Found {matchingWaitlistCount} matching project(s) in Waitlists!</>
                ) : (
                  <>Mencari &ldquo;{searchQuery}&rdquo;? Ditemukan {matchingWaitlistCount} garapan di Halaman Waitlist!</>
                )}
              </p>
              <p className="text-caption text-text-secondary mt-0.5">
                {locale === "en"
                  ? "Feed Airdrop only displays real airdrop & testnet signals. Waitlists are managed in their dedicated section."
                  : "Feed Airdrop khusus untuk sinyal airdrop & testnet. Proyek waitlist dicatat tersendiri di halaman Waitlist."}
              </p>
            </div>
          </div>
          <Link
            href={`/waitlist?q=${encodeURIComponent(searchQuery.trim())}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-caption font-semibold transition-all shadow-md shrink-0 self-stretch sm:self-auto justify-center"
          >
            <span>{locale === "en" ? "Open in Waitlist" : "Buka di Halaman Waitlist"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* FEED STREAM CONTAINER (Liquid Frosted Glass Telegram Message Style) */}
      <div className="space-y-4">
        {displayedFeeds.length === 0 ? (
          <div className="p-12 text-center space-y-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20">
            {matchingWaitlistCount && matchingWaitlistCount > 0 ? (
              <div className="space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto shadow-lg shadow-purple-950/20">
                  <Hourglass className="w-6 h-6" />
                </div>
                <h3 className="text-body-md font-semibold text-text-primary">
                  {locale === "en"
                    ? `"${searchQuery}" is registered in Waitlists!`
                    : `"${searchQuery}" terdaftar di halaman Waitlist!`}
                </h3>
                <p className="text-caption text-text-secondary">
                  {locale === "en"
                    ? `Found ${matchingWaitlistCount} project(s) matching your search in the Waitlist section. Feed Airdrop is dedicated to Testnet & Airdrop tasks.`
                    : `Ditemukan ${matchingWaitlistCount} garapan yang cocok di Halaman Waitlist. Feed Airdrop dikhususkan untuk tugas Testnet & Airdrop.`}
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/waitlist?q=${encodeURIComponent(searchQuery.trim())}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-caption font-semibold transition-all shadow-md"
                  >
                    <span>{locale === "en" ? "View in Waitlists" : "Buka di Halaman Waitlist"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-badge-bg-ready-claim text-status-ready-claim border border-status-ready-claim/30 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        <span>{feed.cost || (locale === "en" ? "Gas Fee" : "Biaya Gas")}</span>
                      </span>
                    )}

                    {/* Category Badge */}
                    {isFeedRetro(feed) ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-badge-bg-ready-claim border border-status-ready-claim/30 text-status-ready-claim flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>{t("feed.retro")}</span>
                      </span>
                    ) : isFeedTestnet(feed) ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-link-teal/15 border border-link-teal/30 text-link-teal flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{t("feed.testnet")}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-status-waiting/15 border border-status-waiting/30 text-status-waiting flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        <span>{t("feed.airdrop")}</span>
                      </span>
                    )}

                    {/* Potential Airdrop Badge */}
                    {isFeedPotential(feed) && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-badge-bg-ready-claim border border-status-ready-claim/30 text-status-ready-claim flex items-center gap-1 shadow-xs"
                        title="Terkonfirmasi sebagai Potential Airdrop dari channel Telegram"
                      >
                        <span>📌</span>
                        <span>Potential Airdrop</span>
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteFeed(feed)}
                      className={`p-1.5 rounded-lg transition-colors ml-1 ${
                        isConverted
                          ? "text-text-tertiary/40 hover:text-accent hover:bg-accent/10 cursor-pointer"
                          : "text-text-tertiary hover:text-status-overdue hover:bg-white/[0.05]"
                      }`}
                      title={
                        isConverted
                          ? (locale === "en"
                              ? "Active project — delete from Projects page"
                              : "Proyek aktif — hapus melalui halaman Proyek")
                          : t("feed.deleteFeedTooltip")
                      }
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
              className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Navigation & Quick Actions */}
              <div className="p-4 sm:p-5 border-b border-border-hairline flex items-center justify-between gap-3 shrink-0 bg-bg-elevated">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border-hairline bg-bg-base shrink-0 flex items-center justify-center shadow-sm">
                    {getChannelInfo(previewingFeed.channel).logo ? (
                      <Image
                        src={getChannelInfo(previewingFeed.channel).logo!}
                        alt={previewingFeed.channel_name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Send className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-body-md font-bold text-text-primary truncate">
                        {previewingFeed.title}
                      </h3>
                      {isFeedPotential(previewingFeed) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-badge-bg-ready-claim border border-status-ready-claim/30 text-status-ready-claim flex items-center gap-1 shadow-xs">
                          <span>📌</span>
                          <span>Potential Airdrop</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-mono text-text-tertiary truncate">
                      <span className="text-text-secondary font-medium">{previewingFeed.channel_name}</span>
                      {" • "}
                      <span>{formatFullDate(previewingFeed.created_at, locale === "en")}</span>
                      {" ("}
                      <span>{formatTimeAgo(previewingFeed.created_at, locale)}</span>
                      {")"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Next / Prev Navigation Strip in Header */}
                  <div className="flex items-center rounded-lg bg-bg-base border border-border-hairline p-0.5">
                    <button
                      type="button"
                      onClick={handlePrevPreview}
                      disabled={currentPreviewIndex <= 0}
                      className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      title={locale === "en" ? "Previous post (←)" : "Postingan sebelumnya (←)"}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-[11px] text-text-secondary px-2">
                      {currentPreviewIndex >= 0 ? currentPreviewIndex + 1 : 1} / {filteredFeeds.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextPreview}
                      disabled={currentPreviewIndex >= filteredFeeds.length - 1}
                      className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      title={locale === "en" ? "Next post (→)" : "Postingan berikutnya (→)"}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

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
                      <span className="hidden sm:inline">
                        {isPreviewTranslating
                          ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                          : showPreviewTranslated
                          ? previewAction.revertLabel
                          : previewAction.buttonLabel}
                      </span>
                    </button>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const raw = showPreviewTranslated && previewTranslatedText ? previewTranslatedText : previewingFeed.raw_text;
                      const textToCopy = cleanDuplicateLinks(raw);
                      navigator.clipboard.writeText(textToCopy);
                      setIsPreviewCopied(true);
                      setTimeout(() => setIsPreviewCopied(false), 2500);
                    }}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-bg-elevated-2 hover:bg-bg-base text-text-secondary hover:text-text-primary border border-border-hairline text-caption font-medium transition-all flex items-center gap-1.5"
                    title="Salin teks postingan Telegram"
                  >
                    {isPreviewCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-status-completed" />
                        <span className="text-status-completed hidden sm:inline">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("common.copy")}</span>
                      </>
                    )}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 transition-colors ml-0.5"
                    title={t("common.close")}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar bg-bg-elevated">
                {/* 1. MENTION INTELLIGENCE & TIMELINE STATS CARD */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-bg-base/90 border border-border-hairline space-y-3 shadow-inner">
                  {/* 4 Stat Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                    {/* Stat 1: Post Date */}
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border-hairline">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary font-medium">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>{locale === "en" ? "Post Date" : "Tanggal Post"}</span>
                      </div>
                      <div
                        className="text-[12px] font-mono font-semibold text-text-primary mt-1 truncate"
                        title={formatFullDate(previewingFeed.created_at, locale === "en")}
                      >
                        {formatFullDate(previewingFeed.created_at, locale === "en")}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary font-mono">
                        {formatTimeAgo(previewingFeed.created_at, locale)}
                      </div>
                    </div>

                    {/* Stat 2: Total Mentions */}
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border-hairline">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary font-medium">
                        <Flame className="w-3.5 h-3.5 text-accent" />
                        <span>{locale === "en" ? "Total Mentions" : "Total Dibahas"}</span>
                      </div>
                      <div className="text-[12px] font-mono font-bold text-accent mt-1">
                        {mentionTimeline?.totalMentions}x {locale === "en" ? "on TG" : "di Telegram"}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary font-mono truncate">
                        {mentionTimeline?.feedCount} {locale === "en" ? "feed post" : "di feed"}
                        {mentionTimeline?.tgCount ? ` • +${mentionTimeline.tgCount} di TG` : ""}
                      </div>
                    </div>

                    {/* Stat 3: First Post */}
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border-hairline">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary font-medium">
                        <Calendar className="w-3.5 h-3.5 text-link-teal" />
                        <span>{locale === "en" ? "First Mention" : "Pertama Kali"}</span>
                      </div>
                      <div
                        className="text-[12px] font-mono font-semibold text-text-primary mt-1 truncate"
                        title={mentionTimeline?.earliestDate ? formatFullDate(mentionTimeline.earliestDate, locale === "en") : ""}
                      >
                        {mentionTimeline?.earliestDate ? formatFullDate(mentionTimeline.earliestDate, locale === "en") : "-"}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary font-mono">
                        {mentionTimeline?.earliestDate ? formatTimeAgo(mentionTimeline.earliestDate, locale) : ""}
                      </div>
                    </div>

                    {/* Stat 4: Latest Post */}
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border-hairline">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-status-completed" />
                        <span>{locale === "en" ? "Latest Mention" : "Terakhir Update"}</span>
                      </div>
                      <div
                        className="text-[12px] font-mono font-semibold text-text-primary mt-1 truncate"
                        title={mentionTimeline?.latestDate ? formatFullDate(mentionTimeline.latestDate, locale === "en") : ""}
                      >
                        {mentionTimeline?.latestDate ? formatFullDate(mentionTimeline.latestDate, locale === "en") : "-"}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary font-mono">
                        {mentionTimeline?.latestDate ? formatTimeAgo(mentionTimeline.latestDate, locale) : ""}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar for Live Updates & History Toggle */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-hairline/60 text-[11px]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRefreshTgUpdates}
                        disabled={isSearchingTg}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-elevated hover:bg-bg-elevated-2 text-text-secondary hover:text-text-primary border border-border-hairline transition-colors disabled:opacity-50 font-medium"
                        title="Pindai live channel Telegram untuk mencari pembaruan terkait sinyal ini"
                      >
                        <RotateCw className={`w-3 h-3 ${isSearchingTg ? "animate-spin text-accent" : ""}`} />
                        <span>
                          {isSearchingTg
                            ? (locale === "en" ? "Scanning Telegram..." : "Memindai Telegram...")
                            : (locale === "en" ? "Check TG Updates" : "Cek Update TG")}
                        </span>
                      </button>

                      {tgSearchResult && (
                        <span className="text-[10.5px] text-text-tertiary font-mono hidden sm:inline">
                          {locale === "en" ? "Updated" : "Update sinkron"}
                        </span>
                      )}
                    </div>

                    {((tgSearchResult?.updates && tgSearchResult.updates.length > 0) || previewMatchingFeeds.length > 1) && (
                      <button
                        type="button"
                        onClick={() => setShowTgHistoryDrawer(!showTgHistoryDrawer)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 hover:bg-accent/20 text-accent font-medium transition-colors"
                      >
                        <History className="w-3 h-3" />
                        <span>
                          {showTgHistoryDrawer
                            ? (locale === "en" ? "Hide History ▲" : "Tutup Riwayat ▲")
                            : (locale === "en"
                                ? `View History (${(tgSearchResult?.updates?.length || 0) + previewMatchingFeeds.length}) ▼`
                                : `Lihat Riwayat (${(tgSearchResult?.updates?.length || 0) + previewMatchingFeeds.length}) ▼`)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Expandable History Drawer */}
                  {showTgHistoryDrawer && (
                    <div className="pt-2 border-t border-border-hairline/60 space-y-2 animate-in fade-in duration-150">
                      <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                        <span>{locale === "en" ? "Post History & Telegram Updates" : "Riwayat Postingan & Update Telegram"}</span>
                        <span className="text-[10px] font-mono text-text-tertiary">
                          {(tgSearchResult?.updates?.length || 0) + previewMatchingFeeds.length} items
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                        {/* Matching Feeds */}
                        {previewMatchingFeeds.map((mf) => (
                          <div
                            key={mf.id}
                            className={`p-2 rounded-lg border text-left flex items-center justify-between gap-2 ${
                              mf.id === previewingFeed.id
                                ? "bg-accent/10 border-accent/30 text-text-primary"
                                : "bg-bg-elevated border-border-hairline text-text-secondary"
                            }`}
                          >
                            <div className="min-w-0 flex-1 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-text-primary truncate">{mf.channel_name}</span>
                                {mf.id === previewingFeed.id && (
                                  <span className="px-1.5 py-0.2 rounded bg-accent/20 text-accent text-[9.5px] font-bold">
                                    {locale === "en" ? "Current" : "Sedang Dibuka"}
                                  </span>
                                )}
                              </div>
                              <div className="text-text-tertiary font-mono text-[10px]">
                                {formatFullDate(mf.created_at, locale === "en")} ({formatTimeAgo(mf.created_at, locale)})
                              </div>
                            </div>
                            {mf.id !== previewingFeed.id && (
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(mf)}
                                className="px-2 py-0.5 rounded text-[10px] bg-bg-base hover:bg-bg-elevated-2 border border-border-hairline text-accent shrink-0 font-medium"
                              >
                                {locale === "en" ? "Open" : "Buka"}
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Live Telegram Updates */}
                        {(tgSearchResult?.updates || []).map((upd: any, idx: number) => (
                          <div
                            key={`tg-${idx}`}
                            className="p-2 rounded-lg bg-bg-elevated border border-border-hairline text-left flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-status-in-progress font-semibold">{upd.channelName || upd.channel}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-badge-bg-in-progress text-status-in-progress border border-status-in-progress/30 font-mono">
                                  Live TG
                                </span>
                              </div>
                              <div className="text-text-tertiary font-mono text-[10px]">
                                {formatFullDate(upd.date, locale === "en")} ({formatTimeAgo(upd.date, locale)})
                              </div>
                              {upd.text && (
                                <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                                  {upd.text}
                                </p>
                              )}
                            </div>
                            <a
                              href={upd.postUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded text-[10px] bg-badge-bg-in-progress hover:bg-badge-bg-in-progress/80 border border-status-in-progress/30 text-status-in-progress shrink-0 inline-flex items-center gap-1 font-medium"
                            >
                              <span>TG</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. TRANSLATION INDICATOR (IF TRANSLATED) */}
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

                {/* 3. POST BODY CONTENT */}
                <div className="p-4 rounded-xl bg-bg-base border border-border-hairline text-body-sm text-text-primary leading-relaxed whitespace-pre-line break-words font-sans selection:bg-accent/30 selection:text-text-primary">
                  {renderInteractiveText(
                    showPreviewTranslated && previewTranslatedText
                      ? previewTranslatedText
                      : previewingFeed.raw_text
                  )}
                </div>
              </div>

              {/* Modal Footer with Hapus, Prev, Next, and Make Project */}
              <div className="p-4 sm:p-5 border-t border-border-hairline bg-bg-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Left: Open Telegram & Delete from Feed */}
                <div className="flex items-center gap-2">
                  <a
                    href={previewingFeed.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated-2 hover:bg-bg-base text-link-teal text-caption font-medium border border-border-hairline transition-all"
                    title="Buka pesan asli di web Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("feed.openTelegram")}</span>
                    <span className="sm:hidden">TG</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>

                  {/* Delete button: removes feed post with confirmation and auto-advances to next */}
                  <button
                    type="button"
                    onClick={() => handleDeletePreview(previewingFeed)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-caption font-medium text-status-overdue hover:bg-badge-bg-overdue bg-badge-bg-overdue/60 border border-status-overdue/30 transition-all"
                    title={locale === "en" ? "Delete this signal from feed (Del)" : "Hapus postingan sinyal ini dari feed (Del)"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{locale === "en" ? "Delete" : "Hapus"}</span>
                  </button>
                </div>

                {/* Right: Browse Previous / Next, Close, and Make Project */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPreview}
                    disabled={currentPreviewIndex <= 0}
                    className="px-3 py-2 rounded-xl text-caption text-text-secondary hover:text-text-primary bg-bg-elevated-2 hover:bg-bg-base border border-border-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium inline-flex items-center gap-1"
                    title={locale === "en" ? "Previous post (←)" : "Postingan sebelumnya (←)"}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{locale === "en" ? "Prev" : "Sebelumnya"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPreview}
                    disabled={currentPreviewIndex >= filteredFeeds.length - 1}
                    className="px-3 py-2 rounded-xl text-caption text-text-secondary hover:text-text-primary bg-bg-elevated-2 hover:bg-bg-base border border-border-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium inline-flex items-center gap-1"
                    title={locale === "en" ? "Next post (→)" : "Postingan berikutnya (→)"}
                  >
                    <span className="hidden sm:inline">{locale === "en" ? "Next" : "Berikutnya"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="px-3.5 py-2 rounded-xl text-caption text-text-secondary hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all font-medium"
                  >
                    {t("common.close")}
                  </button>

                  {previewingFeed.is_imported ? (
                    <Link
                      href={previewingFeed.linked_project_id ? `/projects/${previewingFeed.linked_project_id}` : "/projects"}
                      prefetch={false}
                      className="px-4 py-2 rounded-xl text-caption font-semibold text-status-completed bg-status-completed/15 border border-status-completed/30 hover:bg-status-completed/25 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t("feed.openProject")}</span>
                    </Link>
                  ) : (
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
                  )}
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

      <ConfirmModal
        {...confirmModal}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
