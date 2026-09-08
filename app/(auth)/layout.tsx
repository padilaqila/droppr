import React from "react";
import Link from "next/link";
import { Flame, ArrowLeft } from "lucide-react";
import { HeroDotGrid } from "@/components/features/hero-dot-grid";
import { AuroraWave } from "@/components/features/aurora-wave";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg-base text-text-primary relative overflow-x-hidden select-none">
      {/* Layer 0: Stitch-style Curved Neon Aurora Wave Ribbon */}
      <AuroraWave />

      {/* Layer 1: Interactive Mouse Dot Grid */}
      <HeroDotGrid />

      {/* Navigation Header (Full transparent, seamless, matching landing page) */}
      <header className="h-14 lg:h-16 px-4 sm:px-6 lg:px-12 flex items-center justify-between z-20 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shadow-sm group-hover:scale-105 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <span className="font-sans font-semibold tracking-wider text-base text-text-primary">
            DROPPR
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-bg-elevated border border-border-hairline text-text-tertiary">
            AUTH
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-white transition-colors font-medium px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Kembali ke Beranda</span>
          <span className="sm:hidden">Beranda</span>
        </Link>
      </header>

      {/* Centered Main Viewport */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 flex flex-col justify-center items-center z-10 py-6 sm:py-2">
        {children}
      </main>

      {/* Docked Minimalist Footer (Full transparent, seamless, matching landing page) */}
      <footer className="h-auto sm:h-12 py-2 sm:py-0 px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-1 text-caption text-text-tertiary z-20 border-t border-border-hairline/40 shrink-0">
        <div>
          <span>&copy; 2026 Droppr. Workspace personal airdrop hunter.</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 font-mono text-data-mono-sm">
          <span>Non-custodial & Read-only</span>
          <span>·</span>
          <span>Client-side Protected</span>
        </div>
      </footer>
    </div>
  );
}
