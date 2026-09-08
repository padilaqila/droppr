"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Globe,
  Droplets,
  BookOpen,
  Send,
  Layers,
  Copy,
  Check,
  Wallet,
  Plus,
  Share2,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

interface CustomLinkItem {
  label: string;
  url: string;
}

interface ProjectQuickLinksProps {
  socialLinks?: Record<string, any> | null;
  wallets?: WalletRow[];
  onOpenEditModal: () => void;
  onOpenWalletModal: () => void;
}

export function ProjectQuickLinks({
  socialLinks = {},
  wallets = [],
  onOpenEditModal,
  onOpenWalletModal,
}: ProjectQuickLinksProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rawSocial = socialLinks || {};
  const website = rawSocial.website as string | undefined;
  const dappUrl = rawSocial.dapp_url as string | undefined;
  const faucetUrl = rawSocial.faucet_url as string | undefined;
  const docsUrl = rawSocial.docs_url as string | undefined;
  const twitter = rawSocial.twitter as string | undefined;
  const telegram = rawSocial.telegram as string | undefined;
  const telegramPostUrl = rawSocial.telegram_post_url as string | undefined;
  const discord = rawSocial.discord as string | undefined;
  const refLink = rawSocial.ref_link as string | undefined;
  const customLinks: CustomLinkItem[] = Array.isArray(rawSocial.custom_links)
    ? rawSocial.custom_links
    : [];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority 1: DApp or Main Website Launch Button */}
          {(dappUrl || website) && (
            <a
              href={dappUrl || website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-on-accent text-body-sm font-semibold hover:bg-accent-pressed transition-colors shadow-sm"
              title="Buka Web App / DApp garapan"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{dappUrl ? "Buka DApp" : "Buka Website"}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-90" />
            </a>
          )}

          {/* Priority 2: Faucet Quick Access */}
          {faucetUrl && (
            <div className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 overflow-hidden">
              <a
                href={faucetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-accent text-caption font-semibold hover:bg-accent/20 transition-colors"
                title="Buka Halaman Faucet Testnet"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Faucet</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy("faucet", faucetUrl)}
                className="px-2 py-1.5 border-l border-accent/30 text-accent hover:bg-accent/20 transition-colors"
                title="Salin Link Faucet"
              >
                {copiedId === "faucet" ? (
                  <Check className="w-3 h-3 text-status-completed" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {/* Priority Referral Link / Code */}
          {refLink && (
            <div className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 overflow-hidden">
              <a
                href={refLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-accent text-caption font-semibold hover:bg-accent/20 transition-colors"
                title="Buka Link Referral / Pendaftaran"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Link Ref</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy("reflink", refLink)}
                className="px-2 py-1.5 border-l border-accent/30 text-accent hover:bg-accent/20 transition-colors"
                title="Salin Link Referral"
              >
                {copiedId === "reflink" ? (
                  <Check className="w-3 h-3 text-status-completed" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {/* Docs link */}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary hover:border-link-teal transition-colors text-caption"
            >
              <BookOpen className="w-3.5 h-3.5 text-link-teal" />
              <span>Docs</span>
              <ExternalLink className="w-2.5 h-2.5 text-text-tertiary" />
            </a>
          )}

          {/* Socials quick pills */}
          {twitter && (
            <a
              href={
                twitter.startsWith("http")
                  ? twitter
                  : `https://x.com/${twitter.replace("@", "")}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary transition-colors text-caption font-mono"
            >
              <span className="font-bold">𝕏</span>
              <span>Twitter</span>
            </a>
          )}

          {telegram && (
            <a
              href={
                telegram.startsWith("http")
                  ? telegram
                  : `https://t.me/${telegram.replace("@", "")}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary transition-colors text-caption"
            >
              <Send className="w-3 h-3 text-link-teal" />
              <span>Telegram</span>
            </a>
          )}

          {telegramPostUrl && (
            <a
              href={telegramPostUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-link-teal/15 border border-link-teal/30 text-link-teal hover:bg-link-teal/25 transition-colors text-caption font-semibold"
              title="Buka postingan awal garapan ini di Telegram"
            >
              <Send className="w-3 h-3" />
              <span>Post Induk TG</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          )}

          {discord && (
            <a
              href={discord}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline text-text-secondary hover:text-text-primary transition-colors text-caption"
            >
              <Globe className="w-3 h-3 text-link-teal" />
              <span>Discord</span>
            </a>
          )}

          {/* Custom links */}
          {customLinks.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong text-text-secondary hover:text-text-primary text-caption transition-colors"
            >
              <span>{item.label}</span>
              <ExternalLink className="w-2.5 h-2.5 text-text-tertiary" />
            </a>
          ))}

          <button
            type="button"
            onClick={onOpenEditModal}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-bg-elevated-2/50 border border-dashed border-border-hairline text-text-tertiary hover:text-text-primary hover:border-border-hairline-strong text-caption transition-colors"
            title="Tambah atau kelola tautan proyek"
          >
            <Plus className="w-3 h-3" />
            <span>Link</span>
          </button>
        </div>

        {/* Quick Wallet Address Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {wallets.length > 0 ? (
            wallets.slice(0, 2).map((w) => {
              const isCopied = copiedId === w.id;
              const shortAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
              return (
                <div
                  key={w.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated-2 border border-border-hairline text-caption font-mono"
                  title={`${w.label || "Wallet"}: ${w.address} (Klik untuk salin)`}
                >
                  <Wallet className="w-3 h-3 text-accent shrink-0" />
                  <span className="text-text-secondary">{shortAddr}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(w.id, w.address)}
                    className="p-0.5 rounded hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
                    title="Salin Address"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-status-completed" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated-2/60 border border-dashed border-border-hairline text-text-tertiary hover:text-text-primary text-caption transition-colors"
            >
              <Wallet className="w-3 h-3" />
              <span>Pasang Wallet</span>
            </button>
          )}

          {wallets.length > 2 && (
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="text-[11px] font-mono text-text-tertiary hover:text-text-primary"
            >
              +{wallets.length - 2} lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
