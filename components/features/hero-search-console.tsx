"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  ArrowUp, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  Search,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

type CategoryFilter = "all" | "testnet" | "mainnet";

interface ProjectIntel {
  id: string;
  name: string;
  ecosystem: string;
  category: "testnet" | "mainnet";
  status: "ready-claim" | "in-progress" | "waiting";
  statusLabel: string;
  taskHeadline: string;
  actionText: string;
  accentColor: string;
}

const INTEL_DATA: ProjectIntel[] = [
  {
    id: "berachain",
    name: "Berachain V2",
    ecosystem: "Boyco Ecosystem · EVM",
    category: "testnet",
    status: "ready-claim",
    statusLabel: "Siap Klaim",
    taskHeadline: "Validator delegation & klaim reward bGT terbuka",
    actionText: "Klaim",
    accentColor: "text-accent",
  },
  {
    id: "monad",
    name: "Monad Testnet",
    ecosystem: "High-TPS EVM L1 · Testnet",
    category: "testnet",
    status: "in-progress",
    statusLabel: "Aktif",
    taskHeadline: "Interaksi swap router & faucet checkpoint harian",
    actionText: "Cek Task",
    accentColor: "text-status-in-progress",
  },
  {
    id: "story",
    name: "Story Protocol",
    ecosystem: "IP Asset World · Mainnet Phase 1",
    category: "mainnet",
    status: "waiting",
    statusLabel: "Menunggu",
    taskHeadline: "Snapshot Q3 2026 terkonfirmasi · Registrasi IP asset",
    actionText: "Snapshot",
    accentColor: "text-status-waiting",
  },
];

export function HeroSearchConsole() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const filteredData = INTEL_DATA.filter((item) => {
    const matchesCategory = activeFilter === "all" || item.category === activeFilter;
    const matchesQuery = 
      query === "" || 
      item.name.toLowerCase().includes(query.toLowerCase()) || 
      item.ecosystem.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full max-w-2xl mt-4 sm:mt-5 relative select-none">
      {/* Main Console Box: True Translucent Frosted Glass Effect */}
      <div className="relative rounded-2xl bg-[#0f1420]/45 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.2),0_0_35px_-5px_rgba(139,127,232,0.25)] p-3.5 sm:p-4 text-left transition-all">
        
        {/* Top Input Area: Transparent Field with Subtle Border */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
          <Search className="w-4 h-4 text-white/60 shrink-0 ml-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Protokol airdrop atau task apa yang ingin kamu lacak hari ini?"
            className="w-full bg-transparent text-text-primary placeholder:text-white/40 text-body-sm sm:text-body-md font-sans focus:outline-none tracking-normal"
          />
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-white/50 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 shrink-0">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Middle Live Intel Section: Translucent Protocol Tracker Items */}
        <div className="py-2.5 space-y-1.5">
          {filteredData.map((project) => (
            <Link
              key={project.id}
              href="/dashboard"
              className="group flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-150 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {project.status === "ready-claim" ? (
                    <Flame className="w-3.5 h-3.5 text-accent" />
                  ) : project.status === "in-progress" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-in-progress" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-status-waiting" />
                  )}
                </div>
                <div className="min-w-0 truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-semibold text-text-primary group-hover:text-white transition-colors truncate">
                      {project.name}
                    </span>
                    <span className="text-[10px] font-mono text-white/50 truncate hidden sm:inline">
                      {project.ecosystem}
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
            <div className="py-4 text-center text-white/50 text-caption font-sans">
              Tidak ada airdrop yang cocok dengan pencarian "{query}".
            </div>
          )}
        </div>

        {/* Bottom Control Bar: Stitch-like Segmented Controls & Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-white/10">
          {/* Left Segmented Filter Group */}
          <div className="flex items-center gap-1.5">
            <Link 
              href="/dashboard"
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              title="Tambah airdrop baru ke workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center p-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-0.5 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("testnet")}
                className={`px-2.5 py-0.5 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "testnet"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Testnet
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("mainnet")}
                className={`px-2.5 py-0.5 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "mainnet"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Mainnet
              </button>
            </div>
          </div>

          {/* Right Action Group: Status Indicator & Submit Action Button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/10 text-[11px] font-sans text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-status-completed animate-pulse" />
              <span>Multi-Chain Radar</span>
            </div>

            <Link href="/dashboard">
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-accent hover:bg-accent-pressed text-on-accent flex items-center justify-center shadow-[0_0_15px_rgba(240,169,59,0.5)] hover:scale-105 active:scale-95 transition-all"
                title="Buka Workspace Droppr"
              >
                <ArrowUp className="w-3.5 h-3.5 font-bold stroke-[2.5]" />
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* Suggestion Chips Below Card: 1 Clean Horizontal Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 max-w-2xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3 h-3 text-accent" />
          <span>Checklist Monad Testnet</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3 h-3 text-link-teal" />
          <span>Klaim reward Berachain V2</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-white/25 text-[11px] text-white/85 hover:text-white font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3 h-3 text-status-waiting" />
          <span>Registrasi IP Story Protocol</span>
        </Link>
      </div>
    </div>
  );
}
