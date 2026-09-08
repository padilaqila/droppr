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
    <div className="w-full max-w-2xl mt-6 relative select-none">
      {/* Main Console Box (Stitch-inspired clean elevated container) */}
      <div className="relative rounded-2xl bg-[#151923]/95 backdrop-blur-xl border border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),0_0_50px_-15px_rgba(139,127,232,0.25)] p-4 sm:p-5 text-left transition-all">
        
        {/* Top Input Area: Large Elegant Query Field */}
        <div className="flex items-center gap-3 pb-3 border-b border-border-hairline/80">
          <Search className="w-5 h-5 text-text-tertiary shrink-0 ml-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Protokol airdrop atau task apa yang ingin kamu lacak hari ini?"
            className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-body-md sm:text-base font-sans focus:outline-none tracking-normal"
          />
          <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-text-tertiary px-2 py-0.5 rounded bg-bg-base border border-border-hairline shrink-0">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Middle Live Intel Section: Filtered Real-Time Protocol Tracker */}
        <div className="py-3 space-y-2">
          {filteredData.map((project) => (
            <Link
              key={project.id}
              href="/dashboard"
              className="group flex items-center justify-between p-2.5 rounded-xl bg-bg-elevated/80 hover:bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-all duration-150"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-bg-base/80 border border-border-hairline flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {project.status === "ready-claim" ? (
                    <Flame className="w-4 h-4 text-accent" />
                  ) : project.status === "in-progress" ? (
                    <CheckCircle2 className="w-4 h-4 text-status-in-progress" />
                  ) : (
                    <Clock className="w-4 h-4 text-status-waiting" />
                  )}
                </div>
                <div className="min-w-0 truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-semibold text-text-primary group-hover:text-white transition-colors truncate">
                      {project.name}
                    </span>
                    <span className="text-[10px] font-mono text-text-tertiary truncate hidden sm:inline">
                      {project.ecosystem}
                    </span>
                  </div>
                  <p className="text-caption text-text-secondary truncate mt-0.5">
                    {project.taskHeadline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
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
            <div className="py-6 text-center text-text-tertiary text-caption font-sans">
              Tidak ada airdrop yang cocok dengan pencarian "{query}".
            </div>
          )}
        </div>

        {/* Bottom Control Bar: Stitch-like Segmented Controls & Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-hairline/80">
          {/* Left Segmented Filter Group */}
          <div className="flex items-center gap-1.5">
            <Link 
              href="/dashboard"
              className="w-8 h-8 rounded-lg bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
              title="Tambah airdrop baru ke workspace"
            >
              <Plus className="w-4 h-4" />
            </Link>

            <div className="flex items-center p-0.5 rounded-lg bg-bg-base border border-border-hairline">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-bg-elevated-2 text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("testnet")}
                className={`px-2.5 py-1 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "testnet"
                    ? "bg-bg-elevated-2 text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                Testnet
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("mainnet")}
                className={`px-2.5 py-1 rounded-md text-caption font-medium transition-all ${
                  activeFilter === "mainnet"
                    ? "bg-bg-elevated-2 text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                Mainnet
              </button>
            </div>
          </div>

          {/* Right Action Group: Status Indicator & Submit Action Button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-base/70 border border-border-hairline text-[11px] font-sans text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-status-completed animate-pulse" />
              <span>Multi-Chain Radar</span>
            </div>

            <Link href="/dashboard">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-accent hover:bg-accent-pressed text-on-accent flex items-center justify-center shadow-[0_0_15px_rgba(240,169,59,0.4)] hover:scale-105 active:scale-95 transition-all"
                title="Buka Workspace Droppr"
              >
                <ArrowUp className="w-4 h-4 font-bold stroke-[2.5]" />
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* Suggestion Chips Below Card (Stitch-inspired Quick Query Pills) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-2xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151923]/80 hover:bg-[#1C2230] border border-white/10 hover:border-white/20 text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Checklist task harian Monad Testnet</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151923]/80 hover:bg-[#1C2230] border border-white/10 hover:border-white/20 text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-link-teal" />
          <span>Klaim reward bGT Berachain V2</span>
        </Link>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151923]/80 hover:bg-[#1C2230] border border-white/10 hover:border-white/20 text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-status-waiting" />
          <span>Registrasi IP Story Protocol</span>
        </Link>
      </div>
    </div>
  );
}
