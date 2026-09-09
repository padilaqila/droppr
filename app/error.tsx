"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global client error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4 sm:p-6 text-text-primary">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#0f1420]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-status-overdue/15 text-status-overdue border border-status-overdue/30 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-heading-sm sm:text-heading-md font-bold text-white tracking-tight">
            Terjadi Kendala Sistem
          </h2>
          <p className="text-body-sm text-white/70 leading-relaxed">
            Halaman mengalami kendala saat memuat data. Silakan coba muat ulang atau kembali ke beranda.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-white/50 bg-black/40 p-2.5 rounded-lg border border-white/10 truncate max-w-full">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-[#07090E] font-semibold hover:bg-accent/90 transition-colors text-body-sm shadow-md shadow-accent/15"
          >
            <RotateCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              window.location.href = "/";
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white text-body-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4 text-white/60" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
