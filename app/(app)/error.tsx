"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-bg-elevated/80 backdrop-blur-xl border border-border-hairline shadow-2xl shadow-black/40 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-status-overdue/15 text-status-overdue border border-status-overdue/30 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-heading-sm sm:text-heading-md font-bold text-text-primary tracking-tight">
            Terjadi Kendala Tampilan
          </h2>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Aplikasi mengalami kendala saat memuat data. Jangan khawatir, data garapan Anda tetap aman di sistem.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-text-tertiary bg-bg-base/60 p-2.5 rounded-lg border border-border-hairline truncate max-w-full">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-base font-semibold hover:bg-accent/90 transition-colors text-body-sm shadow-md shadow-accent/15"
          >
            <RotateCw className="w-4 h-4" />
            <span>Muat Ulang Halaman</span>
          </button>

          <Link
            href="/dashboard"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-text-primary text-body-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4 text-text-secondary" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
