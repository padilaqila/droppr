import Link from "next/link";
import { HeroDotGrid } from "@/components/features/hero-dot-grid";
import { ButtonPrimary } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Flame, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Clock, 
  Gift, 
  ShieldCheck,
  CheckCircle2,
  Search
} from "lucide-react";

export default function MarketingPage() {
  return (
    <div 
      className="min-h-screen lg:h-screen lg:max-h-screen flex flex-col justify-between bg-bg-base text-text-primary relative overflow-hidden select-none"
      style={{
        background: "radial-gradient(circle at 15% 20%, rgba(240, 169, 59, 0.10) 0%, transparent 40%), radial-gradient(circle at 85% 75%, rgba(79, 168, 224, 0.08) 0%, transparent 45%), var(--bg-base, #14181F)",
      }}
    >
      {/* Layer 3: Interactive CSS Dot Grid (RAF throttled + prefers-reduced-motion respected) */}
      <HeroDotGrid />

      {/* Navigation Header */}
      <header className="h-16 lg:h-20 px-6 lg:px-12 flex items-center justify-between z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <span className="font-sans font-semibold tracking-wider text-base text-text-primary">
            DROPPR
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-bg-elevated border border-border-hairline text-text-tertiary">
            ALPHA
          </span>
        </div>

        {/* Action Button */}
        <div>
          <Link href="/dashboard">
            <ButtonPrimary className="text-body-sm py-2 px-4 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform">
              Buka Workspace
            </ButtonPrimary>
          </Link>
        </div>
      </header>

      {/* Centered Hero Viewport */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 flex flex-col justify-center items-center text-center z-10 -mt-3 lg:-mt-6">
        
        {/* Top Eyebrow Badge (Label sistem: font-mono diperbolehkan) */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated/80 border border-border-hairline text-caption text-text-secondary mb-5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="font-mono text-[11px] tracking-wide text-text-primary">
            PERSONAL AIRDROP WORKSPACE
          </span>
          <span className="text-border-hairline">/</span>
          <span className="font-mono text-[11px] text-link-teal">
            MISSION CONTROL
          </span>
        </div>

        {/* Main Headline (typography.landing-hero: 64px, 600, -1px letterSpacing) */}
        <h1 className="text-heading-1 md:text-landing-hero font-semibold text-text-primary tracking-tight leading-[1.08] max-w-3xl font-sans">
          Kendali penuh <br />
          seluruh airdrop kamu
        </h1>

        {/* Subtitle (typography.subtitle: 18px, 400, 1.5 lineHeight) */}
        <p className="text-subtitle font-normal text-text-secondary max-w-xl mx-auto leading-relaxed mt-4 font-sans">
          Satu workspace personal untuk melacak task harian, jadwal snapshot, status wallet, dan reminder klaim token tanpa spreadsheet yang berantakan.
        </p>

        {/* Centerpiece Search / Preview Card (Manifest Console Panel) */}
        <div className="w-full max-w-2xl mt-8 relative">
          <div 
            className="relative rounded-xl bg-bg-elevated border border-border-hairline p-5 sm:p-6 space-y-4 text-left"
            style={{ boxShadow: "0 0 40px -10px rgba(240, 169, 59, 0.12)" }}
          >
            {/* Garis aksen atas */}
            <div className="absolute top-0 left-4 right-4 h-[2px] bg-accent rounded-full" />

            {/* 4 Corner tick marks */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-text-tertiary" />
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-text-tertiary" />
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-text-tertiary" />
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-text-tertiary" />

            {/* Search Input Bar Imitation */}
            <Link href="/dashboard" className="block">
              <div className="flex items-center justify-between p-3 rounded-md bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-colors cursor-pointer group/bar">
                <div className="flex items-center gap-3 text-text-tertiary group-hover/bar:text-text-secondary transition-colors">
                  <Search className="w-4 h-4 text-text-tertiary group-hover/bar:text-text-primary transition-colors" />
                  <span className="text-body-sm font-sans">
                    Cari airdrop, filter status, atau hubungkan wallet kamu...
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-text-tertiary px-1.5 py-0.5 rounded bg-bg-base border border-border-hairline">
                  <span>Ctrl</span>
                  <span>K</span>
                </div>
              </div>
            </Link>

            {/* 3 Operational Status Chips (Data Netral & Tanpa Angka Fiktif) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              
              {/* Item 1: Berachain Ready to Claim (Amber HANYA untuk status Siap Klaim) */}
              <Link href="/dashboard" className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-colors flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-badge-bg-ready-claim text-status-ready-claim flex items-center justify-center shrink-0">
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-body-sm font-medium text-text-primary font-sans truncate">Berachain V2</div>
                    <div className="text-caption text-text-tertiary font-sans truncate">Boyco Ecosystem</div>
                  </div>
                </div>
                <StatusBadge status="ready-claim" label="Siap Klaim" className="shrink-0 text-[10px] py-0.5 px-2" />
              </Link>

              {/* Item 2: Monad In Progress */}
              <Link href="/dashboard" className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-colors flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-badge-bg-in-progress text-status-in-progress flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-body-sm font-medium text-text-primary font-sans truncate">Monad Testnet</div>
                    <div className="text-caption text-text-tertiary font-sans truncate">Interaksi Router</div>
                  </div>
                </div>
                <StatusBadge status="in-progress" label="Aktif" className="shrink-0 text-[10px] py-0.5 px-2" />
              </Link>

              {/* Item 3: Story Protocol Waiting */}
              <Link href="/dashboard" className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong transition-colors flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-badge-bg-waiting text-status-waiting flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-body-sm font-medium text-text-primary font-sans truncate">Story Protocol</div>
                    <div className="text-caption text-text-tertiary font-sans truncate">Registrasi IP Asset</div>
                  </div>
                </div>
                <StatusBadge status="waiting" label="Menunggu" className="shrink-0 text-[10px] py-0.5 px-2" />
              </Link>

            </div>

            {/* Bottom Bar Inside Card (Data Netral) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-hairline">
              <div className="flex items-center gap-2 text-caption text-text-tertiary font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-status-completed" />
                <span>Manifest Tracker Aktif · Multi-Chain Radar</span>
              </div>

              <Link href="/dashboard">
                <span className="inline-flex items-center gap-1 text-body-sm text-link-teal hover:underline font-medium font-sans cursor-pointer">
                  <span>Buka Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

          </div>
        </div>

        {/* Quick Filter Chips (Pills Horizontal, Netral) */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-2xl">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-elevated/70 hover:bg-bg-elevated border border-border-hairline hover:border-border-hairline-strong text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Berachain V2 — Siap Klaim</span>
          </Link>

          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-elevated/70 hover:bg-bg-elevated border border-border-hairline hover:border-border-hairline-strong text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-status-in-progress" />
            <span>Monad Testnet — Interaksi Router</span>
          </Link>

          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-elevated/70 hover:bg-bg-elevated border border-border-hairline hover:border-border-hairline-strong text-caption text-text-secondary hover:text-text-primary font-sans transition-all shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-status-completed" />
            <span>100% Non-Custodial & Read-Only</span>
          </Link>
        </div>

      </main>

      {/* Docked Minimalist Footer */}
      <footer className="h-14 px-6 lg:px-12 flex items-center justify-between text-caption text-text-tertiary z-20 border-t border-border-hairline/60">
        <div>
          <span>&copy; 2026 Droppr. Workspace personal airdrop hunter.</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-data-mono-sm">
          <span>Non-custodial & Read-only</span>
          <span>·</span>
          <span>Client-side Protected</span>
        </div>
      </footer>

    </div>
  );
}
