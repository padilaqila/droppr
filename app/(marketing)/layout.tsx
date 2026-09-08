import type { Metadata } from "next";
import { MarketingThemeSync } from "./theme-sync";

export const metadata: Metadata = {
  title: "Droppr — Personal Airdrop Workspace",
  description: "Mission-control workspace for airdrop hunters",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-root min-h-screen bg-bg-base text-text-primary">
      <MarketingThemeSync />
      {children}
    </div>
  );
}
