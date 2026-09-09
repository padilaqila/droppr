"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { 
  X, 
  ExternalLink, 
  Radio, 
  CheckCircle2, 
  Send,
  HeartHandshake
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface PartnerInfo {
  id: string;
  name: string;
  handle: string;
  roleId: string;
  roleEn: string;
  logo: string;
  telegramUrl: string;
  descId: string;
  descEn: string;
  badgeId: string;
  badgeEn: string;
  accentBorder: string;
  stats: string;
}

export const PARTNERS: PartnerInfo[] = [
  {
    id: "airdropfinder",
    name: "Airdrop Finder",
    handle: "@airdropfind",
    roleId: "Kanal Publik & Komunitas Airdrop",
    roleEn: "Public Channel & Airdrop Community",
    logo: "/images/credits/airdropfinder.webp",
    telegramUrl: "https://t.me/airdropfind",
    descId:
      "Kanal airdrop publik di Telegram yang membagikan panduan step-by-step testnet, node runner, dan peluang airdrop bagi komunitas.",
    descEn:
      "Public Telegram airdrop channel sharing step-by-step testnet guides, node runner, and community airdrop opportunities.",
    badgeId: "Kanal Publik Telegram",
    badgeEn: "Telegram Public Channel",
    accentBorder: "hover:border-[#38BDF8] group-hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.3)]",
    stats: "100K+ Hunters",
  },
  {
    id: "dutacrypto",
    name: "Duta Crypto",
    handle: "@dutacryptoairdrop",
    roleId: "Kanal Edukasi & Media Riset Web3",
    roleEn: "Education Channel & Web3 Research",
    logo: "/images/credits/dutacrypto.webp",
    telegramUrl: "https://t.me/dutacryptoairdrop",
    descId:
      "Platform edukasi dan riset crypto yang mengulas ekosistem blockchain, fundamental proyek, dan rangkuman airdrop publik.",
    descEn:
      "Crypto education and research platform reviewing blockchain ecosystems, project fundamentals, and public airdrop digests.",
    badgeId: "Kanal Publik Telegram",
    badgeEn: "Telegram Public Channel",
    accentBorder: "hover:border-[#F0A93B] group-hover:shadow-[0_0_30px_-5px_rgba(240,169,59,0.3)]",
    stats: "Since 2021",
  },
];

export function CommunityCreditsTrigger({ onOpenModal }: { onOpenModal: () => void }) {
  const { isEn } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all text-[11px] text-text-secondary hover:text-text-primary shadow-sm cursor-pointer"
      title={isEn ? "View Telegram Public Channel Sources" : "Lihat Sumber Kanal Publik Telegram"}
    >
      <HeartHandshake className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />
      <span className="font-sans">{isEn ? "Public Sources:" : "Sumber Publik:"}</span>
      <div className="flex items-center -space-x-1.5">
        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20">
          <Image src="/images/credits/airdropfinder.webp" alt="Airdrop Finder" fill className="object-cover" sizes="16px" />
        </div>
        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20">
          <Image src="/images/credits/dutacrypto.webp" alt="Duta Crypto" fill className="object-cover" sizes="16px" />
        </div>
      </div>
      <span className="font-semibold text-text-primary">Airdrop Finder & Duta Crypto</span>
    </button>
  );
}

export function InteractivePartnerCards({ onSelectPartner }: { onSelectPartner: (partner: PartnerInfo) => void }) {
  const { isEn } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
      {PARTNERS.map((partner) => (
        <div
          key={partner.id}
          onClick={() => onSelectPartner(partner)}
          className={`group relative rounded-2xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline ${partner.accentBorder} p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Interactive Logo Frame with glow */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-bg-base border border-border-hairline shrink-0 group-hover:scale-105 transition-all p-1">
              <Image
                src={partner.logo}
                alt={partner.name}
                fill
                className="object-contain p-1 rounded-lg"
                sizes="48px"
              />
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-status-completed border border-bg-elevated animate-pulse" />
            </div>

            <div className="min-w-0 truncate text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-body-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                  {partner.name}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-link-teal shrink-0" />
              </div>
              <p className="text-[11px] text-text-tertiary truncate font-mono">
                {partner.handle} · {partner.stats}
              </p>
              <p className="text-caption text-text-secondary truncate mt-0.5">
                {isEn ? partner.roleEn : partner.roleId}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <span className="w-7 h-7 rounded-full bg-bg-base group-hover:bg-accent group-hover:text-black border border-border-hairline flex items-center justify-center text-text-secondary transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommunityCreditsModal({
  isOpen,
  onClose,
  initialPartner,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPartner?: PartnerInfo | null;
}) {
  const { isEn } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overscroll-contain animate-in fade-in duration-200"
    >
      {/* Full-screen Backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#07090E]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl bg-bg-elevated border border-border-hairline shadow-2xl p-6 text-left space-y-5 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "#8B5CF6" }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-hairline pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-heading-3 font-semibold text-text-primary font-sans">
                {isEn ? "Telegram Channel References" : "Referensi Kanal Telegram"}
              </h3>
              <p className="text-caption text-text-secondary font-sans mt-0.5">
                {isEn
                  ? "Airdrop data is aggregated from public Telegram channels for informational reference."
                  : "Data airdrop diambil dari channel Telegram publik sebagai referensi info."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-elevated-2 hover:bg-bg-base border border-border-hairline flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Partner Cards Details */}
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {PARTNERS.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-xl bg-bg-base border border-border-hairline hover:border-border-hairline-strong transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-bg-elevated border border-border-hairline p-1 shrink-0">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      fill
                      className="object-contain p-1 rounded-lg"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-body-md font-semibold text-text-primary">
                        {partner.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-link-teal/15 border border-link-teal/30 text-link-teal">
                        {isEn ? partner.badgeEn : partner.badgeId}
                      </span>
                    </div>
                    <span className="text-caption font-mono text-text-tertiary">
                      {partner.handle} · {partner.stats}
                    </span>
                  </div>
                </div>

                <a
                  href={partner.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-pressed text-on-accent text-caption font-semibold shadow-sm hover:scale-105 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isEn ? "Telegram Channel" : "Kanal Telegram"}</span>
                </a>
              </div>

              <p className="text-body-sm text-text-secondary leading-relaxed font-sans">
                {isEn ? partner.descEn : partner.descId}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] text-[11px] text-text-tertiary font-sans">
                <Radio className="w-3 h-3 text-status-completed animate-pulse" />
                <span>
                  {isEn
                    ? "Updates fetched from public Telegram feeds for community reference"
                    : "Pembaruan diambil dari feed publik Telegram untuk referensi komunitas"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer Disclaimer */}
        <div className="pt-2.5 pb-0.5 text-left text-[11px] text-text-tertiary/80 leading-relaxed border-t border-white/10 font-sans space-y-1">
          <p className="font-semibold text-text-secondary">
            {isEn ? "Disclaimer & Copyright:" : "Disclaimer & Hak Cipta:"}
          </p>
          <p>
            {isEn
              ? "Droppr is an independent personal workspace and is not officially affiliated with the channels above. All content and logos are copyrights of their respective channel owners."
              : "Droppr adalah workspace personal independen dan tidak berafiliasi secara resmi dengan channel-channel di atas. Seluruh konten dan logo adalah hak cipta dari masing-masing pemilik channel."}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
