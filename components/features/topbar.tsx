"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Menu, Flame, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import { useRouter, usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationPopover } from "@/components/features/notification-popover";
import { useTranslation } from "@/lib/i18n/context";

export interface TopbarProps {
  onOpenMobileNav?: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isEn } = useTranslation();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with URL and local search events
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q") || "";
      if (q) setSearchQuery(q);

      const handleSync = (e: any) => {
        if (typeof e.detail?.query === "string") {
          setSearchQuery(e.detail.query);
        }
      };
      window.addEventListener("droppr-sync-search" as any, handleSync);
      return () => window.removeEventListener("droppr-sync-search" as any, handleSync);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("droppr-global-search", { detail: { query: val } }));
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const isSearchablePage = ["/feed", "/projects", "/waitlist", "/tasks"].some((p) =>
        pathname?.startsWith(p)
      );
      if (!isSearchablePage) {
        router.push(`/feed?q=${encodeURIComponent(searchQuery)}`);
      } else if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (searchQuery.trim()) {
          url.searchParams.set("q", searchQuery.trim());
        } else {
          url.searchParams.delete("q");
        }
        window.history.replaceState(null, "", url.toString());
      }
    }
  };

  const handleClearSearch = () => {
    handleSearchChange("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    }
  };

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
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t("topbar.searchPlaceholder")}
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-8 py-1.5 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent transition-colors placeholder:text-text-disabled"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5 rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
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

          {/* Activity, Daily Tasks & Telegram Notifications Popover */}
          <NotificationPopover />
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
