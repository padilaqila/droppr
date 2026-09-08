import Link from "next/link";
import { ButtonPrimary } from "@/components/ui/button";
import { CardBase } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Flame, CheckCircle2, ArrowRight } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* Navigation */}
      <header className="h-16 border-b border-border-hairline px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Flame className="w-4 h-4" />
          </div>
          <span className="font-sans font-semibold tracking-wider text-base">DROPPR</span>
        </div>
        <Link href="/dashboard">
          <ButtonPrimary className="text-body-sm py-2 px-4">
            Buka Workspace
          </ButtonPrimary>
        </Link>
      </header>

      {/* Split Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Copy */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated border border-border-hairline text-caption text-text-secondary font-mono">
            <span>● ALPHA RELEASE</span>
            <span className="text-text-tertiary">|</span>
            <span className="text-link-teal">Personal Airdrop HQ</span>
          </div>

          <h1 className="text-heading-1 md:text-landing-hero font-semibold text-text-primary tracking-tight">
            Kendali penuh seluruh airdrop yang kamu ikuti.
          </h1>

          <p className="text-subtitle text-text-secondary max-w-xl">
            Satu workspace personal untuk melacak task harian, jadwal snapshot, status wallet, dan reminder klaim token tanpa spreadsheet yang berantakan.
          </p>

          <div className="pt-2 flex items-center gap-4">
            <Link href="/dashboard">
              <ButtonPrimary className="text-body-md py-3 px-6 flex items-center gap-2">
                <span>Mulai Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </ButtonPrimary>
            </Link>
          </div>
        </div>

        {/* Right: Operational Manifest Preview */}
        <div className="lg:col-span-5">
          <CardBase className="space-y-4 shadow-elevation-1">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                  Live Manifest
                </span>
              </div>
              <span className="text-caption font-mono text-data-mono-sm text-text-tertiary">
                4 Tasks Hari Ini
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-status-completed" />
                  <div>
                    <div className="text-body-sm font-medium text-text-primary">
                      Daily Testnet Swap
                    </div>
                    <div className="text-[11px] font-mono text-text-tertiary">
                      Berachain V2 · 0x8a9...41c
                    </div>
                  </div>
                </div>
                <StatusBadge status="in-progress" />
              </div>

              <div className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm border border-border-hairline-strong" />
                  <div>
                    <div className="text-body-sm font-medium text-text-primary">
                      Bridge ke Story Protocol
                    </div>
                    <div className="text-[11px] font-mono text-text-tertiary">
                      Story Protocol · 0x3d2...88f
                    </div>
                  </div>
                </div>
                <StatusBadge status="waiting" />
              </div>

              <div className="p-3 rounded-md bg-bg-elevated-2 border border-accent/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm border border-accent bg-accent/20" />
                  <div>
                    <div className="text-body-sm font-medium text-text-primary">
                      Klaim Alokasi Airdrop
                    </div>
                    <div className="text-[11px] font-mono text-accent">
                      Mainnet Snapshot Ready
                    </div>
                  </div>
                </div>
                <StatusBadge status="ready-claim" />
              </div>
            </div>
          </CardBase>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-hairline py-6 px-6 md:px-12 text-caption text-text-tertiary flex items-center justify-between">
        <span>&copy; 2026 Droppr. Workspace personal airdrop hunter.</span>
        <span className="font-mono text-data-mono-sm">Non-custodial & Read-only</span>
      </footer>
    </div>
  );
}
