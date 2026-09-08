"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Wallet,
  Bell,
  Settings,
  Flame,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects & Folders", href: "/projects", icon: FolderGit2 },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Wallets & Accounts", href: "/wallets", icon: Wallet },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bg-sidebar border-r border-border-hairline flex flex-col z-30 select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-border-hairline">
        <div className="w-7 h-7 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
          <Flame className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-semibold tracking-wider text-sm text-text-primary">
            DROPPR
          </span>
          <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-tight">
            Airdrop HQ
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
          Workspace
        </div>

        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-body-sm font-medium transition-colors ${
                isActive
                  ? "bg-bg-elevated-2 text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Quick Folders & Projects Section */}
        <div className="pt-6 px-2 pb-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center justify-between">
          <span>Pinned Projects</span>
        </div>
        <div className="space-y-0.5">
          <Link
            href="/projects/demo-1"
            className="flex items-center justify-between px-3 py-1.5 rounded-sm text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <span className="truncate">Story Protocol</span>
            <ChevronRight className="w-3 h-3 text-text-tertiary" />
          </Link>
          <Link
            href="/projects/demo-2"
            className="flex items-center justify-between px-3 py-1.5 rounded-sm text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <span className="truncate">Berachain V2</span>
            <ChevronRight className="w-3 h-3 text-text-tertiary" />
          </Link>
        </div>
      </nav>

      {/* User Session & Sign Out Footer */}
      <div className="p-3 border-t border-border-hairline space-y-2 bg-bg-sidebar">
        {userEmail && (
          <div className="flex items-center gap-2 px-2 py-1 text-caption text-text-secondary">
            <UserIcon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <span className="truncate font-mono text-[11px]">{userEmail}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-caption text-text-secondary hover:text-status-overdue hover:bg-bg-elevated transition-colors"
            title="Keluar dari akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
          <span className="font-mono text-data-mono-sm text-text-tertiary">
            v0.1.0-alpha
          </span>
        </div>
      </div>
    </aside>
  );
}
