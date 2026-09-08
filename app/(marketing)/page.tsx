import Link from "next/link";
import { HeroDotGrid } from "@/components/features/hero-dot-grid";
import { AuroraWave } from "@/components/features/aurora-wave";
import { HeroSearchConsole } from "@/components/features/hero-search-console";
import { ButtonPrimary } from "@/components/ui/button";
import { Flame } from "lucide-react";

export default function MarketingPage() {
  return (
    <div 
      className="min-h-screen lg:h-screen lg:max-h-screen flex flex-col justify-between bg-bg-base text-text-primary relative overflow-hidden select-none"
    >
      {/* Layer 0: Stitch-style Curved Neon Aurora Wave Ribbon */}
      <AuroraWave />

      {/* Layer 1: Interactive CSS Dot Grid (RAF throttled + prefers-reduced-motion respected) */}
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
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 flex flex-col justify-center items-center text-center z-10 -mt-2 lg:-mt-5">
        
        {/* Top Eyebrow Badge (Label sistem: font-mono diperbolehkan) */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated/80 border border-border-hairline text-caption text-text-secondary mb-4 shadow-sm">
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
        <p className="text-subtitle font-normal text-text-secondary max-w-xl mx-auto leading-relaxed mt-3 font-sans">
          Satu workspace personal untuk melacak task harian, jadwal snapshot, status wallet, dan reminder klaim token tanpa spreadsheet yang berantakan.
        </p>

        {/* New Stitch-Inspired Airdrop Mission Control Console */}
        <HeroSearchConsole />

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
