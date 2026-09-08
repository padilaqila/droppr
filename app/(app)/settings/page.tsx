"use client";

import { CardBase } from "@/components/ui/card";
import { ButtonSecondary } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-heading-2 font-semibold text-text-primary">Settings</h1>
        <p className="text-body-sm text-text-secondary">
          Pengaturan tampilan, akun, preferensi notifikasi, dan integrasi AI.
        </p>
      </div>

      {/* Tampilan & Tema */}
      <CardBase className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-app-section-title font-semibold text-text-primary">
              Tema Tampilan (Mode Gelap / Terang)
            </h2>
            <p className="text-body-sm text-text-secondary">
              Pilih antara tema Gelap (Mission Control) atau Terang (Clean Workspace).
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardBase>

      {/* AI Assistant Integration */}
      <CardBase className="space-y-2">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          AI Smart Parser (SumoPod AI)
        </h2>
        <p className="text-body-sm text-text-secondary">
          Integrasi SumoPod AI aktif untuk ekstraksi postingan airdrop otomatis (Paste & Track).
        </p>
        <div className="text-caption font-mono text-text-tertiary">
          Status: Terhubung (Endpoint: https://ai.sumopod.com/v1)
        </div>
      </CardBase>

      <CardBase className="space-y-4">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Akun & Keamanan
        </h2>
        <p className="text-body-sm text-text-secondary">
          Autentikasi dikelola oleh Supabase Auth.
        </p>
        <div className="pt-2">
          <ButtonSecondary>Kelola Profil</ButtonSecondary>
        </div>
      </CardBase>

      <CardBase className="space-y-4">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Export Data
        </h2>
        <p className="text-body-sm text-text-secondary">
          Unduh seluruh data project, task, dan catatan ke dalam format JSON/CSV.
        </p>
        <div className="pt-2">
          <ButtonSecondary>Export Data</ButtonSecondary>
        </div>
      </CardBase>
    </div>
  );
}
