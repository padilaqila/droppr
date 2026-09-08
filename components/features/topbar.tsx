"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Plus, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import { WalletConnectButton } from "@/components/features/wallet-connect-button";
import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  return (
    <>
      <header className="h-14 bg-bg-base border-b border-border-hairline px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Search Bar */}
        <div className="flex items-center gap-2 w-72">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari task, project, wallet..."
              className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-1.5 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent transition-colors placeholder:text-text-disabled"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Add Project & AI Button */}
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            aria-label="Tambah Project"
            className="inline-flex items-center gap-1.5 bg-bg-elevated text-text-primary border border-border-hairline text-body-sm font-semibold rounded-md px-3 py-1.5 hover:bg-bg-elevated-2 transition-colors"
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>Tambah</span>
          </button>

          {/* Theme Toggle (Light / Dark Mode) */}
          <ThemeToggle />

          {/* Notifications */}
          <Link
            href="/reminders"
            prefetch={false}
            aria-label="Notifikasi & Pengingat"
            className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 border border-border-hairline transition-colors relative"
            title="Buka Pengingat & Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-accent absolute top-2 right-2 ring-2 ring-bg-base" />
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
