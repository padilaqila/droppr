import React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col justify-center items-center px-4 py-12 select-none">
      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:bg-accent/25 transition-colors">
          <Flame className="w-5 h-5" />
        </div>
        <span className="font-sans font-semibold tracking-wider text-xl text-text-primary">
          DROPPR
        </span>
      </Link>

      {/* Main Form Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer Info */}
      <div className="mt-8 text-caption text-text-tertiary font-mono text-center">
        Workspace personal airdrop hunter · Non-custodial
      </div>
    </div>
  );
}
