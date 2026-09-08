"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import {
  Rss,
  RefreshCw,
  Search,
  ExternalLink,
  Send,
  Trash2,
  CheckCircle2,
  Circle,
  FolderPlus,
  Clock,
  Zap,
  Flame,
  Wallet,
  Coins,
  Check,
  RotateCcw,
  AlertCircle,
  X,
} from "lucide-react";
import {
  fetchAirdropFeeds,
  deleteAirdropFeed,
  cleanupExpiredFeeds,
  convertFeedToProject,
  convertFeedToProjectWithAI,
  resetFeedImportStatus,
  type AirdropFeedItem,
} from "@/lib/supabase/airdrop-feeds";
import { ProjectReviewModal } from "@/components/features/project-review-modal";

interface FeedClientViewProps {
  initialFeeds: AirdropFeedItem[];
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

export function FeedClientView({ initialFeeds }: FeedClientViewProps) {
  const router = useRouter();
  const [feeds, setFeeds] = useState<AirdropFeedItem[]>(initialFeeds);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States: Tipe Garapan (Testnet, Retro/Mainnet) & Biaya/Modal (Gratis, Berbayar)
  const [channelFilter, setChannelFilter] = useState<"all" | "dutacryptoairdrop" | "airdropfind">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "testnet" | "retro">("all");
  const [costFilter, setCostFilter] = useState<"all" | "free" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive Task Selection per feed (id -> set of checked task indices)
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Set<number>>>({});

  // Converting to project loading state
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertedSuccessId, setConvertedSuccessId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [reviewingFeed, setReviewingFeed] = useState<AirdropFeedItem | null>(null);

  // Convert feed item to official Droppr Project (AI or manual)
  const handleMakeProject = async (feed: AirdropFeedItem, useAI: boolean = false) => {
    if (convertingId) return;
    setConvertingId(feed.id);
    setErrorMessage(null);

    try {
      const res = useAI
        ? await convertFeedToProjectWithAI(feed)
        : await convertFeedToProject(feed);

      if (res.success && res.projectId) {
        setConvertedSuccessId(feed.id);
        setFeeds((prev) =>
          prev.map((f) =>
            f.id === feed.id ? { ...f, is_imported: true, linked_project_id: res.projectId } : f
          )
        );

        // Redirect directly to the newly created project workstation
        router.push(`/projects/${res.projectId}`);
      } else {
        setErrorMessage(res.error || "Gagal membuat proyek dari feed ini. Periksa data atau coba lagi.");
      }
    } catch (err: any) {
      console.error("Convert to project error:", err);
      setErrorMessage(err?.message || "Terjadi kesalahan saat memproses data proyek.");
    } finally {
      setConvertingId(null);
    }
  };

  // Reset feed imported status
  const handleResetFeedStatus = async (feedId: string) => {
    if (resettingId) return;
    setResettingId(feedId);
    setErrorMessage(null);

    try {
      const ok = await resetFeedImportStatus(feedId);
      if (ok) {
        setFeeds((prev) =>
          prev.map((f) =>
            f.id === feedId ? { ...f, is_imported: false, linked_project_id: null } : f
          )
        );
        if (convertedSuccessId === feedId) {
          setConvertedSuccessId(null);
        }
      } else {
        setErrorMessage("Gagal mereset status garapan.");
      }
    } catch (err: any) {
      console.error("Reset feed status error:", err);
      setErrorMessage(err?.message || "Gagal mereset status garapan.");
    } finally {
      setResettingId(null);
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

  // Delete individual feed item
  const handleDeleteFeed = async (feedId: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    await deleteAirdropFeed(feedId);
  };

  // Toggle task checkbox in feed card
  const handleToggleFeedTask = (feedId: string, taskIdx: number) => {
    setSelectedTasks((prev) => {
      const currentSet = new Set(prev[feedId] || []);
      if (currentSet.has(taskIdx)) {
        currentSet.delete(taskIdx);
      } else {
        currentSet.add(taskIdx);
      }
      return { ...prev, [feedId]: currentSet };
    });
  };

  // Filtered feeds logic (Testnet vs Retro vs Waitlist & Free vs Paid)
  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
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
        } else if (categoryFilter === "waitlist") {
          const isWaitlist = feed.category === "waitlist" || feed.title.toLowerCase().includes("waitlist");
          if (!isWaitlist) return false;
        }
      }

      // Cost filter (Gratis vs Berbayar)
      if (costFilter === "free") {
        if (!isFeedFree(feed)) return false;
      } else if (costFilter === "paid") {
        if (!isFeedPaid(feed)) return false;
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
    });
  }, [feeds, channelFilter, categoryFilter, costFilter, searchQuery]);

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

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/20">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-heading-2 font-bold text-text-primary tracking-tight">
                Feed Airdrop Baru
              </h1>
              <p className="text-body-sm text-text-secondary mt-0.5">
                Kurasi garapan testnet & airdrop baru (maksimal 1 bulan). Tersimpan di cloud & otomatis kadaluarsa 1 bulan.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ButtonSecondary
            onClick={handleCleanupExpired}
            className="!py-1.5 !px-3 text-caption text-text-tertiary hover:text-text-primary border-border-subtle"
            title="Bersihkan postingan lama yang sudah melebihi 30 hari"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Bersihkan &gt;1 Bln</span>
          </ButtonSecondary>

          <ButtonPrimary
            onClick={handleSyncFeed}
            disabled={isSyncing}
            className="!py-1.5 !px-3.5 text-body-sm inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Memindai..." : "Sinkronkan Feed"}</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* SYNC NOTIFICATION BANNER */}
      {syncStatus && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-body-sm flex items-center justify-between">
          <span>{syncStatus}</span>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="text-caption hover:underline text-text-tertiary hover:text-text-primary ml-2 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ERROR ALERT BANNER */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-status-danger/15 border border-status-danger/30 text-status-danger text-body-sm flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded hover:bg-status-danger/20 text-status-danger transition-colors shrink-0"
            title="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <CardBase className="p-4 space-y-3.5 border-border-subtle">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1 bg-bg-elevated-2 p-1 rounded-lg text-caption overflow-x-auto max-w-full pb-0.5">
            <button
              type="button"
              onClick={() => setChannelFilter("all")}
              className={`px-3 py-1 rounded-md transition-all font-medium shrink-0 ${
                channelFilter === "all"
                  ? "bg-bg-elevated text-text-primary font-semibold shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              Semua Channel
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("dutacryptoairdrop")}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 shrink-0 ${
                channelFilter === "dutacryptoairdrop"
                  ? "bg-accent/20 text-accent font-semibold shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <Send className="w-3 h-3 text-accent" />
              <span>Duta Crypto</span>
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("airdropfind")}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 shrink-0 ${
                channelFilter === "airdropfind"
                  ? "bg-link-teal/20 text-link-teal font-semibold shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <Send className="w-3 h-3 text-link-teal" />
              <span>Airdrop Finder</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama garapan, token, atau protokol di feed..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Tipe Garapan Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border-subtle text-caption">
          <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1">
            Tipe Garapan:
          </span>

          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors ${
              categoryFilter === "all"
                ? "bg-bg-elevated-2 text-text-primary border-border-hairline-strong font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            Semua ({feeds.length})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("testnet")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
              categoryFilter === "testnet"
                ? "bg-link-teal/15 text-link-teal border-link-teal/40 font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            <span>Testnet ({testnetCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("retro")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
              categoryFilter === "retro"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            <Flame className="w-2.5 h-2.5" />
            <span>Retro / Mainnet ({retroCount})</span>
          </button>
        </div>

        {/* Biaya / Modal (Cost) Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border-subtle text-caption">
          <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider mr-1">
            Biaya / Modal:
          </span>

          <button
            type="button"
            onClick={() => setCostFilter("all")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors ${
              costFilter === "all"
                ? "bg-bg-elevated-2 text-text-primary border-border-hairline-strong font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            Semua Biaya
          </button>

          <button
            type="button"
            onClick={() => setCostFilter("free")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
              costFilter === "free"
                ? "bg-status-completed/15 text-status-completed border-status-completed/40 font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            <Coins className="w-2.5 h-2.5" />
            <span>Gratis / Faucet ({freeCostCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCostFilter("paid")}
            className={`px-2.5 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
              costFilter === "paid"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold shadow-xs"
                : "border-transparent bg-bg-elevated-2/60 text-text-tertiary hover:text-text-primary hover:border-border-hairline"
            }`}
          >
            <Wallet className="w-2.5 h-2.5" />
            <span>Berbayar / Gas Fee ({paidCostCount})</span>
          </button>
        </div>
      </CardBase>

      {/* FEED STREAM CONTAINER */}
      <div className="space-y-4">
        {filteredFeeds.length === 0 ? (
          <CardBase className="p-12 text-center space-y-3">
            <Rss className="w-8 h-8 text-text-tertiary mx-auto" />
            <h3 className="text-body-md font-semibold text-text-primary">
              Belum ada postingan airdrop baru di feed
            </h3>
            <p className="text-caption text-text-secondary max-w-md mx-auto">
              Klik tombol &quot;Sinkronkan Feed&quot; di atas untuk memindai peluang airdrop dan testnet terbaru dari channel Telegram pilihan.
            </p>
            <div className="pt-2">
              <ButtonPrimary onClick={handleSyncFeed} disabled={isSyncing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sinkronkan Sekarang</span>
              </ButtonPrimary>
            </div>
          </CardBase>
        ) : (
          filteredFeeds.map((feed) => {
            const isDuta = feed.channel === "dutacryptoairdrop";
            const checkedSet = selectedTasks[feed.id] || new Set();
            const isConverting = convertingId === feed.id;
            const isConverted = feed.is_imported || convertedSuccessId === feed.id;

            return (
              <CardBase
                key={feed.id}
                className={`p-4 md:p-5 transition-all space-y-3.5 border-border-subtle ${
                  isConverted
                    ? "bg-bg-elevated/40 border-status-completed/30"
                    : "hover:border-border-hairline"
                }`}
              >
                {/* Post Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Channel Avatar Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        isDuta
                          ? "bg-accent/15 text-accent border-accent/25"
                          : "bg-link-teal/15 text-link-teal border-link-teal/25"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-bold text-text-primary truncate">
                          {feed.channel_name}
                        </span>
                        <span className="text-[11px] font-mono text-text-tertiary">
                          @{feed.channel}
                        </span>
                        <span className="text-text-tertiary text-caption">•</span>
                        <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                          <Clock className="w-3 h-3 text-text-tertiary/70" />
                          <span>{formatDate(feed.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Cost Badge */}
                    {isFeedFree(feed) ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold border bg-status-completed/10 text-status-completed border-status-completed/25 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        <span>Gratis</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/25 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        <span>{feed.cost || "Berbayar (Gas Fee)"}</span>
                      </span>
                    )}

                    {/* Category Badge: Testnet or Retro */}
                    {feed.category === "retro" || isFeedPaid(feed) ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>Retro / Mainnet</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-link-teal/10 border border-link-teal/25 text-link-teal flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Testnet</span>
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1 text-text-tertiary hover:text-status-overdue rounded transition-colors ml-1"
                      title="Hapus dari feed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Post Title & Summary */}
                <div className="space-y-1">
                  <h2 className="text-heading-3 font-bold text-text-primary tracking-tight">
                    {feed.title}
                  </h2>
                  {feed.summary && (
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      {feed.summary}
                    </p>
                  )}
                </div>

                {/* Interactive Task Checklist Preview */}
                {feed.tasks && feed.tasks.length > 0 && (
                  <div className="p-3 rounded-lg bg-bg-elevated-2/50 border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                        <span>Langkah Garapan Terdeteksi ({feed.tasks.length}):</span>
                      </span>
                      <span className="text-[11px] text-text-tertiary font-mono">
                        {checkedSet.size} dari {feed.tasks.length} langkah dipilih
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {feed.tasks.map((taskText, idx) => {
                        const isChecked = checkedSet.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleFeedTask(feed.id, idx)}
                            className={`px-2.5 py-1.5 rounded-md border text-caption flex items-start gap-2 cursor-pointer transition-all ${
                              isChecked
                                ? "bg-accent/10 border-accent/40 text-text-primary font-medium shadow-xs"
                                : "bg-bg-elevated/80 border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-hairline hover:bg-bg-elevated"
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isChecked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-text-tertiary/60" />
                              )}
                            </div>
                            <span className="leading-snug break-words">{taskText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Post Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
                  <div className="flex items-center gap-2">
                    {/* Convert directly into project button */}
                    {isConverted ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-status-completed/15 text-status-completed border border-status-completed/30 text-caption font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Sudah Jadi Proyek Garapan</span>
                        </span>

                        {feed.linked_project_id && (
                          <Link
                            href={`/projects/${feed.linked_project_id}`}
                            prefetch={false}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-elevated hover:bg-bg-elevated-2 text-text-primary border border-border-hairline text-caption font-medium transition-colors"
                            title="Buka workstation proyek ini"
                          >
                            <span>Lihat Proyek</span>
                            <ExternalLink className="w-3 h-3 text-text-tertiary" />
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => handleResetFeedStatus(feed.id)}
                          disabled={resettingId === feed.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated border border-transparent hover:border-border-hairline transition-colors text-caption"
                          title="Reset status garapan feed ini agar bisa dibuat ulang"
                        >
                          <RotateCcw className={`w-3 h-3 ${resettingId === feed.id ? "animate-spin text-accent" : ""}`} />
                          <span>{resettingId === feed.id ? "Mereset..." : "Reset"}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewingFeed(feed)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent text-on-accent hover:bg-accent-pressed transition-colors text-body-sm font-semibold shadow-xs"
                        title="Review dan buat proyek Droppr"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>+ Proyek</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Shortcut live search di X (Twitter) untuk mengecek sentimen/KOL nyata */}
                    <a
                      href={`https://x.com/search?q=${encodeURIComponent(
                        feed.title
                          .replace(/^(TESTNET|AIRDROP|FREE|NEW AIRDROPS?|NEW TESTNET|NEW WAITLIST)\s*[:|-]?\s*/i, "")
                          .trim()
                      )}+airdrop&f=live`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated hover:bg-bg-elevated-2 text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-hairline text-caption font-medium transition-colors"
                      title="Cek siapa saja yang membicarakan proyek ini di X (Twitter) secara live"
                    >
                      <Search className="w-3 h-3" />
                      <span>Cek di X</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>

                    <a
                      href={feed.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated text-link-teal hover:underline text-caption font-medium border border-border-subtle hover:border-border-hairline transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Telegram</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  </div>
                </div>
              </CardBase>
            );
          })
        )}
      </div>

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
