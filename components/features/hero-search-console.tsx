"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Plus, 
  ArrowUp, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Search, 
  RotateCw, 
  Radio, 
  ShieldCheck,
  HeartHandshake
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommunityCreditsModal, PARTNERS } from "./community-credits-modal";
import { useTranslation } from "@/lib/i18n/context";

type CategoryFilter = "all" | "testnet" | "waitlist";

export interface LiveFeedItem {
  id: string;
  channelKey: "airdropfind" | "dutacryptoairdrop";
  channelName: string;
  channelLogo: string;
  title: string;
  ecosystem: string;
  category: "testnet" | "mainnet" | "waitlist";
  status: "ready-claim" | "in-progress" | "waiting";
  statusLabel: string;
  taskHeadline: string;
  postUrl: string;
  claimUrl?: string | null;
  targetUrl?: string | null;
  isClaim?: boolean;
  isWaitlist?: boolean;
  date: string;
  actionText: string;
}

const DEFAULT_FALLBACK_DATA: LiveFeedItem[] = [
  {
    id: "pawffle-whitelist",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "New Whitelist: Pawffle",
    ecosystem: "Solana & EVM Ecosystem",
    category: "waitlist",
    status: "waiting",
    statusLabel: "Waitlist",
    taskHeadline: "Register: https://www.pawffles.xyz - Early whitelist registration",
    postUrl: "https://t.me/airdropfind",
    targetUrl: "https://www.pawffles.xyz",
    isWaitlist: true,
    date: new Date().toISOString(),
    actionText: "Daftar",
  },
  {
    id: "berachain-v2",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "Berachain V2 (Boyco)",
    ecosystem: "Boyco Ecosystem · Artio EVM",
    category: "testnet",
    status: "ready-claim",
    statusLabel: "Siap Klaim",
    taskHeadline: "Validator delegation terbuka & reward bGT siap diklaim via faucet",
    postUrl: "https://t.me/airdropfind",
    claimUrl: "https://t.me/airdropfind",
    isClaim: true,
    date: new Date().toISOString(),
    actionText: "Klaim",
  },
  {
    id: "monad-testnet",
    channelKey: "dutacryptoairdrop",
    channelName: "Duta Crypto",
    channelLogo: "/images/credits/dutacrypto.webp",
    title: "Monad Testnet 10k TPS",
    ecosystem: "High-Performance EVM L1",
    category: "testnet",
    status: "in-progress",
    statusLabel: "Aktif",
    taskHeadline: "Interaksi swap smart contract & daily faucet checkpoint aktif",
    postUrl: "https://t.me/dutacryptoairdrop",
    claimUrl: null,
    isClaim: false,
    date: new Date().toISOString(),
    actionText: "Cek Task",
  },
  {
    id: "story-protocol",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "Story Protocol",
    ecosystem: "IP Asset World · Mainnet Phase 1",
    category: "mainnet",
    status: "waiting",
    statusLabel: "Menunggu",
    taskHeadline: "Snapshot Q3 2026 terkonfirmasi · Registrasi IP asset",
    postUrl: "https://t.me/airdropfind",
    claimUrl: null,
    isClaim: false,
    date: new Date().toISOString(),
    actionText: "Snapshot",
  },
];

export function HeroSearchConsole() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LiveFeedItem[]>(DEFAULT_FALLBACK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  // Fetch live feed from Telegram channels on component mount
  const fetchTelegramFeed = async (showSyncSpinner = false) => {
    if (showSyncSpinner) setIsSyncing(true);
    else setIsLoading(true);

    try {
      const res = await fetch("/api/feed/live");
      if (res.ok) {
        const json = await res.json();
        if (json?.items && Array.isArray(json.items) && json.items.length > 0) {
          setItems(json.items);
        }
      }
    } catch (err) {
      console.error("Failed to sync telegram feed:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchTelegramFeed();
  }, []);

  const filteredData = items.filter((item) => {
    let matchesCategory = true;
    if (activeFilter === "testnet") {
      matchesCategory = item.category === "testnet";
    } else if (activeFilter === "waitlist") {
      const lowerTitle = item.title.toLowerCase();
      const lowerHeadline = item.taskHeadline.toLowerCase();
      const lowerAction = item.actionText.toLowerCase();
      const lowerTargetUrl = (item.targetUrl || item.claimUrl || "").toLowerCase();
      const lowerPostUrl = (item.postUrl || "").toLowerCase();

      matchesCategory = 
        item.isWaitlist === true ||
        item.category === "waitlist" ||
        item.statusLabel.toLowerCase().includes("waitlist") ||
        lowerTitle.includes("waitlist") ||
        lowerTitle.includes("whitelist") ||
        lowerHeadline.includes("waitlist") ||
        lowerHeadline.includes("whitelist") ||
        lowerAction.includes("daftar") ||
        lowerTargetUrl.includes("waitlist") ||
        lowerTargetUrl.includes("whitelist") ||
        lowerPostUrl.includes("waitlist") ||
        lowerPostUrl.includes("whitelist");
    }

    const matchesQuery = 
      query === "" || 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.ecosystem.toLowerCase().includes(query.toLowerCase()) || 
      item.taskHeadline.toLowerCase().includes(query.toLowerCase()) ||
      item.channelName.toLowerCase().includes(query.toLowerCase()) ||
      Boolean(item.targetUrl && item.targetUrl.toLowerCase().includes(query.toLowerCase()));

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full max-w-2xl mt-4 sm:mt-5 relative select-none">
      {/* Main Console Box: Translucent Frosted Glass Effect */}
      <div className="relative rounded-2xl bg-[#0f1420]/45 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.2),0_0_35px_-5px_rgba(139,127,232,0.25)] p-3.5 sm:p-4 text-left transition-all">
        
        {/* Top Input & Sync Bar */}
        <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="w-4 h-4 text-white/60 shrink-0 ml-1" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("marketing.searchPlaceholder")}
              className="w-full bg-transparent text-text-primary placeholder:text-white/40 text-body-sm sm:text-body-md font-sans focus:outline-none tracking-normal"
            />
          </div>

          {/* Sync status & Manual re-sync button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchTelegramFeed(true)}
              disabled={isLoading || isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] text-white/80 hover:text-white transition-all disabled:opacity-50"
              title={t("marketing.syncTelegram")}
            >
              <RotateCw className={`w-3 h-3 text-link-teal ${isSyncing || isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline font-sans">
                {isSyncing ? t("marketing.syncing") : t("marketing.syncTelegram")}
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-white/50 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Live Telegram Public Feeds with Loading Skeleton */}
        <div className="py-2.5 space-y-1.5 min-h-[160px] flex flex-col justify-center">
          {isLoading ? (
            /* Elegant Skeleton Shimmer Loading State */
            <div className="space-y-2 py-1 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-[11px] text-text-tertiary font-sans py-1">
                <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span>{t("marketing.connectingChannels")}</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-7 h-7 rounded-lg bg-white/10 shrink-0" />
                    <div className="w-full space-y-1.5">
                      <div className="h-3.5 bg-white/15 rounded w-1/3" />
                      <div className="h-2.5 bg-white/10 rounded w-4/5" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            /* Live Rendered Telegram Data */
            <>
              {filteredData.slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  href={project.targetUrl || project.claimUrl || project.postUrl || "/dashboard"}
                  target={project.targetUrl || project.claimUrl || project.postUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-150 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Source Channel Logo Frame */}
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/10 border border-white/20 shrink-0 group-hover:scale-105 transition-transform p-1 flex items-center justify-center">
                      <Image
                        src={project.channelLogo}
                        alt={project.channelName}
                        width={32}
                        height={32}
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>

                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-text-primary group-hover:text-white transition-colors truncate">
                          {project.title}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 truncate hidden sm:inline">
                          via {project.channelName}
                        </span>
                      </div>
                      <p className="text-caption text-white/70 truncate mt-0.5">
                        {project.taskHeadline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge 
                      status={project.status} 
                      label={project.statusLabel}
                      className="text-[10px] py-0.5 px-2"
                    />
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-link-teal group-hover:underline">
                      <span>{project.actionText}</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}

              {filteredData.length === 0 && (
                <div className="py-6 text-center text-white/50 text-caption font-sans">
                  {t("marketing.noTelegramMatch")} &quot;{query}&quot;.
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Control Bar: Stitch-like Segmented Controls & Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-white/10">
          {/* Left Segmented Filter Group */}
          <div className="flex items-center gap-1.5">
            <Link 
              href="/dashboard"
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              title={t("nav.quickAdd")}
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center p-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider transition-all uppercase ${
                  activeFilter === "all"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {t("marketing.filterAll")}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("testnet")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider transition-all uppercase ${
                  activeFilter === "testnet"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {t("marketing.filterTestnet")}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("waitlist")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider transition-all uppercase ${
                  activeFilter === "waitlist"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {t("marketing.filterWaitlist")}
              </button>
            </div>
          </div>

          {/* Right Action Group: Live Telegram Indicator & Submit Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreditsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-[11px] font-sans text-white/80 hover:text-white transition-all cursor-pointer"
              title={t("marketing.telegramSources")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-completed animate-pulse" />
              <span>{t("marketing.telegramSources")}</span>
              <HeartHandshake className="w-3 h-3 text-accent ml-0.5" />
            </button>

            <Link href="/dashboard">
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-accent hover:bg-accent-pressed text-on-accent flex items-center justify-center shadow-[0_0_15px_rgba(240,169,59,0.5)] hover:scale-105 active:scale-95 transition-all"
                title={t("marketing.openWorkspaceTitle")}
              >
                <ArrowUp className="w-3.5 h-3.5 font-bold stroke-[2.5]" />
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* Universal Workspace Capabilities Below Card */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 max-w-2xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <CheckCircle2 className="w-3 h-3 text-status-completed" />
          <span>{t("marketing.capDaily")}</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <ShieldCheck className="w-3 h-3 text-status-in-progress" />
          <span>{t("marketing.capWallet")}</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <Clock className="w-3 h-3 text-accent" />
          <span>{t("marketing.capReminder")}</span>
        </Link>
      </div>

      {/* Community Public Sources Bar with Interactive Logos */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 max-w-2xl mx-auto px-2">
        <div className="flex items-center gap-2 text-[11px] text-white/60 font-sans">
          <span>{t("marketing.communityRef")}</span>
        </div>

        <div className="flex items-center gap-2">
          {PARTNERS.map((partner) => (
            <button
              key={partner.id}
              type="button"
              onClick={() => {
                setSelectedPartner(partner);
                setIsCreditsOpen(true);
              }}
              className="group flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-white/25 transition-all shadow-sm cursor-pointer"
            >
              {/* Interactive Framed Logo */}
              <div className="relative w-5 h-5 rounded-md overflow-hidden bg-black/50 border border-white/20 p-0.5 group-hover:scale-110 group-hover:border-accent transition-all">
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  fill
                  className="object-contain"
                  sizes="20px"
                />
              </div>
              <span className="text-[11px] font-medium text-white/85 group-hover:text-white transition-colors">
                {partner.name}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsCreditsOpen(true)}
            className="text-[11px] text-link-teal hover:underline ml-1 font-medium cursor-pointer"
          >
            {t("marketing.sourceDetail")}
          </button>
        </div>
      </div>

      {/* Community Credits Popup Modal */}
      <CommunityCreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        initialPartner={selectedPartner}
      />
    </div>
  );
}

