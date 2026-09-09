"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggleLocale, isId } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-caption font-mono font-semibold text-text-secondary hover:text-text-primary transition-all shrink-0 ${className}`}
      title={isId ? "Ganti ke Bahasa Inggris (Switch to English)" : "Switch to Indonesian (Ganti ke Bahasa Indonesia)"}
      aria-label="Toggle language"
    >
      <Globe className="w-3.5 h-3.5 text-accent" />
      <span className="text-[11px] tracking-wider uppercase">{locale}</span>
    </button>
  );
}
