"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, Plus, Bell, Menu, Flame } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import { useRouter } from "next/navigation";

const WalletConnectButton = dynamic(
  () => import("@/components/features/wallet-connect-button").then((m) => m.WalletConnectButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-20 sm:w-24 bg-white/[0.04] rounded-md border border-white/10 animate-pulse" />
    ),
  }
);

import { LanguageToggle } from "@/components/ui/language-toggle";
import { useTranslation } from "@/lib/i18n/context";

export interface TopbarProps {
  onOpenMobileNav?: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const router = useRouter();
  const { t, isEn } = useTranslation();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  return (
    <>
      <header className="h-14 bg-bg-base border-b border-border-hairline px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Left Side: Hamburger (Mobile) + Mini Brand (Mobile) + Search Bar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label={isEn ? "Open Navigation Menu" : "Buka Menu Navigasi"}
            className="md:hidden p-1.5 -ml-1 mr-0.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mini Droppr Logo (Mobile Only) */}
          <div className="flex md:hidden items-center gap-1.5 mr-1 shrink-0">
            <div className="w-6 h-6 rounded bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans font-bold text-xs tracking-wider text-text-primary">
              DROPPR
            </span>
          </div>

          {/* Search Bar (Tablet & Desktop) */}
          <div className="hidden sm:flex items-center gap-2 w-48 md:w-72">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={t("topbar.searchPlaceholder")}
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-1.5 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent transition-colors placeholder:text-text-disabled"
              />
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Add Project Button */}
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            aria-label={t("topbar.addProject")}
            className="inline-flex items-center gap-1 sm:gap-1.5 bg-bg-elevated text-text-primary border border-border-hairline text-body-sm font-semibold rounded-md px-2.5 sm:px-3 py-1.5 hover:bg-bg-elevated-2 transition-colors"
          >
            <Plus className="w-4 h-4 text-accent shrink-0" />
            <span className="hidden sm:inline">{t("topbar.addProject")}</span>
          </button>

          {/* Language Switcher (ID / EN) */}
          <LanguageToggle />

          {/* Theme Toggle (Light / Dark Mode) */}
          <ThemeToggle />

          {/* Notifications */}
          <Link
            href="/reminders"
            prefetch={false}
            aria-label={t("topbar.notificationsTitle")}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 border border-border-hairline transition-colors relative shrink-0"
            title={t("topbar.notificationsTitle")}
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-accent absolute top-1.5 right-1.5 sm:top-2 sm:right-2 ring-2 ring-bg-base" />
          </Link>

          {/* Real Web3 Wallet Connect & On-chain Balance */}
          <WalletConnectButton />
        </div>
      </header>

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
