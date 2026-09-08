"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary, ButtonDanger } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  User,
  Bell,
  Palette,
  Download,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  Sparkles,
  FileJson,
  FileSpreadsheet,
  Clock,
  KeyRound,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SettingsTab = "account" | "notifications" | "appearance_ai" | "backup" | "danger";

interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  push: boolean;
  defaultTime: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // User state
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notification prefs state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    inApp: true,
    email: false,
    push: false,
    defaultTime: "09:00",
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Export states
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Danger zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user info & notification preferences
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email || "");
        setUserId(data.user.id || "");
      }
    });

    try {
      const savedPrefs = localStorage.getItem("droppr-notification-prefs");
      if (savedPrefs) {
        setNotificationPrefs(JSON.parse(savedPrefs));
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  const handleCopyUserId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password baru harus minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Password berhasil diubah. Gunakan password baru untuk login berikutnya.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Gagal mengubah password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotificationPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "droppr-notification-prefs",
        JSON.stringify(notificationPrefs)
      );
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save prefs:", err);
    }
  };

  const handleExportJson = async () => {
    setIsExportingJson(true);
    setExportSuccess(null);
    try {
      const supabase = createClient() as any;
      const [
        { data: projects },
        { data: tasks },
        { data: wallets },
        { data: reminders },
        { data: folders },
      ] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("reminders").select("*"),
        supabase.from("folders").select("*"),
      ]);

      const backupData = {
        app: "Droppr",
        version: "0.1.0-alpha",
        exportedAt: new Date().toISOString(),
        user: { id: userId, email: userEmail },
        folders: folders || [],
        projects: projects || [],
        tasks: tasks || [],
        wallets: wallets || [],
        reminders: reminders || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `droppr-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess("File backup JSON berhasil diunduh.");
    } catch (err) {
      console.error("Export JSON failed:", err);
      alert("Gagal mengekspor data JSON.");
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setExportSuccess(null);
    try {
      const supabase = createClient() as any;
      const [{ data: projects }, { data: tasks }] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("tasks").select("*"),
      ]);

      const rows = [
        ["Nama Project", "Chain", "Status", "Total Task", "Task Selesai", "Tanggal Dibuat"],
      ];

      (projects || []).forEach((p: any) => {
        const projTasks = (tasks || []).filter((t: any) => t.project_id === p.id);
        const doneTasks = projTasks.filter((t: any) => t.status === "done").length;
        rows.push([
          `"${(p.name || "").replace(/"/g, '""')}"`,
          `"${p.chain || "-"}"`,
          `"${p.status}"`,
          String(projTasks.length),
          String(doneTasks),
          `"${new Date(p.created_at).toLocaleDateString("id-ID")}"`,
        ]);
      });

      const csvContent = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `droppr-projects-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess("File CSV ringkasan project berhasil diunduh.");
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert("Gagal mengekspor CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleClearCompletedTasks = async () => {
    if (!confirm("Hapus semua tugas yang sudah berstatus 'Selesai'? Tugas yang belum selesai akan tetap disimpan.")) {
      return;
    }
    setDangerMsg(null);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.from("tasks").delete().eq("status", "done");
      if (error) throw error;
      setDangerMsg({
        type: "success",
        text: "Seluruh tugas yang selesai berhasil dibersihkan.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerMsg({
        type: "error",
        text: err?.message || "Gagal membersihkan tugas selesai.",
      });
    }
  };

  const handleDeleteAllProjects = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "HAPUS") {
      setDangerMsg({
        type: "error",
        text: 'Ketik kata "HAPUS" secara persis untuk konfirmasi penghapusan seluruh data.',
      });
      return;
    }

    setIsDeleting(true);
    setDangerMsg(null);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;

      setDeleteConfirmText("");
      setDangerMsg({
        type: "success",
        text: "Seluruh proyek dan tugas turunan berhasil dihapus.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerMsg({
        type: "error",
        text: err?.message || "Gagal menghapus data proyek.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-heading-2 font-semibold text-text-primary">Settings</h1>
        <p className="text-body-sm text-text-secondary">
          Kelola akun, preferensi notifikasi, tampilan workspace, dan backup data.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border-hairline overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-caption font-semibold transition-colors whitespace-nowrap ${
            activeTab === "account"
              ? "bg-accent text-on-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Akun & Keamanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-caption font-semibold transition-colors whitespace-nowrap ${
            activeTab === "notifications"
              ? "bg-accent text-on-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifikasi & Pengingat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appearance_ai")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-caption font-semibold transition-colors whitespace-nowrap ${
            activeTab === "appearance_ai"
              ? "bg-accent text-on-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Tampilan & AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-caption font-semibold transition-colors whitespace-nowrap ${
            activeTab === "backup"
              ? "bg-accent text-on-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export & Backup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("danger")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-caption font-semibold transition-colors whitespace-nowrap ${
            activeTab === "danger"
              ? "bg-status-overdue text-text-primary"
              : "text-text-secondary hover:text-status-overdue hover:bg-bg-elevated"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Zona Bahaya</span>
        </button>
      </div>

      {/* TAB 1: AKUN & KEAMANAN */}
      {activeTab === "account" && (
        <div className="space-y-4">
          <CardBase className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <h2 className="text-app-section-title font-semibold text-text-primary">
                Informasi Akun
              </h2>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-caption font-semibold text-text-secondary mb-1">
                  Email Terdaftar
                </label>
                <div className="h-10 px-4 flex items-center rounded-md bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary font-mono">
                  {userEmail || "Memuat..."}
                </div>
              </div>

              <div>
                <label className="block text-caption font-semibold text-text-secondary mb-1">
                  User ID (Supabase Auth UID)
                </label>
                <div className="flex items-center gap-2">
                  <div className="h-10 px-4 flex-1 flex items-center rounded-md bg-bg-elevated-2 border border-border-hairline text-caption text-text-secondary font-mono truncate">
                    {userId || "-"}
                  </div>
                  <ButtonSecondary
                    type="button"
                    onClick={handleCopyUserId}
                    className="!py-2 !px-3 shrink-0 inline-flex items-center gap-1.5"
                    title="Salin UID"
                  >
                    {copiedId ? (
                      <Check className="w-4 h-4 text-status-completed" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedId ? "Tersalin" : "Salin"}</span>
                  </ButtonSecondary>
                </div>
              </div>
            </div>
          </CardBase>

          {/* Form Ubah Password */}
          <CardBase className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" />
              <h2 className="text-app-section-title font-semibold text-text-primary">
                Ubah Password
              </h2>
            </div>
            <p className="text-body-sm text-text-secondary">
              Ganti kata sandi akun Anda untuk meningkatkan keamanan workspace.
            </p>

            {passwordSuccess && (
              <div className="p-3 rounded-md bg-status-completed/10 border border-status-completed/30 text-status-completed text-caption flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-caption font-semibold text-text-secondary mb-1">
                  Password Baru
                </label>
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              <div>
                <label className="block text-caption font-semibold text-text-secondary mb-1">
                  Konfirmasi Password Baru
                </label>
                <Input
                  type="password"
                  placeholder="Ketik ulang password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              <div className="pt-2">
                <ButtonPrimary type="submit" disabled={passwordLoading || !newPassword}>
                  {passwordLoading ? "Menyimpan..." : "Perbarui Password"}
                </ButtonPrimary>
              </div>
            </form>
          </CardBase>

          {/* Sesi & Logout */}
          <CardBase className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-app-section-title font-semibold text-text-primary">
                  Sesi Login
                </h2>
                <p className="text-body-sm text-text-secondary">
                  Keluar dari sesi saat ini di peramban ini.
                </p>
              </div>
              <ButtonDanger
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </ButtonDanger>
            </div>
          </CardBase>
        </div>
      )}

      {/* TAB 2: NOTIFIKASI & PENGINGAT */}
      {activeTab === "notifications" && (
        <CardBase className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-app-section-title font-semibold text-text-primary">
              Preferensi Pengingat
            </h2>
          </div>
          <p className="text-body-sm text-text-secondary">
            Atur saluran pengiriman notifikasi dan jam default untuk agenda harian airdrop.
          </p>

          {notifSaved && (
            <div className="p-3 rounded-md bg-status-completed/10 border border-status-completed/30 text-status-completed text-caption flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Preferensi notifikasi berhasil disimpan.</span>
            </div>
          )}

          <form onSubmit={handleSaveNotificationPrefs} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="block text-caption font-semibold text-text-secondary">
                Saluran Notifikasi yang Diaktifkan
              </label>

              <label className="flex items-center gap-3 p-3 rounded-md bg-bg-elevated-2 border border-border-hairline cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationPrefs.inApp}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, inApp: e.target.checked })
                  }
                  className="rounded text-accent focus:ring-accent"
                />
                <div>
                  <div className="text-body-sm font-semibold text-text-primary">
                    In-App Notification (Rekomendasi)
                  </div>
                  <div className="text-caption text-text-tertiary">
                    Pengingat muncul langsung di Dashboard dan icon lonceng Droppr.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-md bg-bg-elevated-2 border border-border-hairline cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, email: e.target.checked })
                  }
                  className="rounded text-accent focus:ring-accent"
                />
                <div>
                  <div className="text-body-sm font-semibold text-text-primary">
                    Email Digest (via Supabase Edge Functions)
                  </div>
                  <div className="text-caption text-text-tertiary">
                    Kirim ringkasan pengingat snapshot dan task penting ke email terdaftar.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-md bg-bg-elevated-2 border border-border-hairline cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationPrefs.push}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, push: e.target.checked })
                  }
                  className="rounded text-accent focus:ring-accent"
                />
                <div>
                  <div className="text-body-sm font-semibold text-text-primary">
                    Browser Push Notification
                  </div>
                  <div className="text-caption text-text-tertiary">
                    Pemberitahuan pop-up langsung di desktop saat browser aktif.
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-caption font-semibold text-text-secondary mb-1">
                Jam Pengiriman Pengingat Harian Default
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <select
                  value={notificationPrefs.defaultTime}
                  onChange={(e) =>
                    setNotificationPrefs({
                      ...notificationPrefs,
                      defaultTime: e.target.value,
                    })
                  }
                  className="h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline focus:outline-none focus:border-accent font-mono"
                >
                  <option value="07:00">07:00 WIB (Pagi Awal)</option>
                  <option value="09:00">09:00 WIB (Pagi Hari - Rekomendasi)</option>
                  <option value="12:00">12:00 WIB (Siang)</option>
                  <option value="18:00">18:00 WIB (Sore)</option>
                  <option value="20:00">20:00 WIB (Malam Hari)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <ButtonPrimary type="submit">Simpan Preferensi Notifikasi</ButtonPrimary>
            </div>
          </form>
        </CardBase>
      )}

      {/* TAB 3: TAMPILAN & AI */}
      {activeTab === "appearance_ai" && (
        <div className="space-y-4">
          <CardBase className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-app-section-title font-semibold text-text-primary">
                  Tema Tampilan
                </h2>
                <p className="text-body-sm text-text-secondary">
                  Pilih antara Mode Gelap (Mission Control `#14181F`) atau Mode Terang (`#F5F3EF`).
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardBase>

          <CardBase className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="text-app-section-title font-semibold text-text-primary">
                AI Smart Parser (SumoPod AI Integration)
              </h2>
            </div>
            <p className="text-body-sm text-text-secondary">
              Droppr dilengkapi integrasi AI untuk membaca postingan airdrop dari X / Telegram dan mengekstrak nama proyek, jaringan, checklist tugas, serta link sosial secara otomatis.
            </p>

            <div className="p-3.5 rounded-md bg-bg-elevated-2 border border-border-hairline space-y-2 text-caption">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono">Status Integrasi:</span>
                <span className="px-2 py-0.5 rounded-full bg-status-completed/15 text-status-completed font-semibold">
                  ● Terhubung & Aktif
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono">Endpoint API:</span>
                <span className="text-text-primary font-mono">https://ai.sumopod.com/v1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono">Default Model:</span>
                <span className="text-text-primary font-mono">deepseek-chat / llama-3.3-70b</span>
              </div>
            </div>
          </CardBase>
        </div>
      )}

      {/* TAB 4: EXPORT & BACKUP */}
      {activeTab === "backup" && (
        <CardBase className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            <h2 className="text-app-section-title font-semibold text-text-primary">
              Export & Cadangan Data Workspace
            </h2>
          </div>
          <p className="text-body-sm text-text-secondary">
            Sesuai prinsip non-custodial & kedaulatan data di Droppr, Anda dapat mengunduh seluruh database proyek, checklist task, dan jadwal kapan saja.
          </p>

          {exportSuccess && (
            <div className="p-3 rounded-md bg-status-completed/10 border border-status-completed/30 text-status-completed text-caption flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-lg bg-bg-elevated-2 border border-border-hairline flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-primary font-semibold text-body-sm">
                  <FileJson className="w-4 h-4 text-accent" />
                  <span>Cadangan Lengkap (JSON)</span>
                </div>
                <p className="text-caption text-text-tertiary">
                  Menyimpan seluruh struktur proyek, folder, task, catatan, relasi wallet, dan pengingat untuk di-restore atau diarsipkan.
                </p>
              </div>
              <ButtonPrimary
                onClick={handleExportJson}
                disabled={isExportingJson}
                className="w-full !py-2 text-caption inline-flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingJson ? "Membuat Backup..." : "Unduh Backup JSON"}</span>
              </ButtonPrimary>
            </div>

            <div className="p-4 rounded-lg bg-bg-elevated-2 border border-border-hairline flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-primary font-semibold text-body-sm">
                  <FileSpreadsheet className="w-4 h-4 text-link-teal" />
                  <span>Ringkasan Spreadsheet (CSV)</span>
                </div>
                <p className="text-caption text-text-tertiary">
                  Format tabel yang kompatibel dengan Excel, Google Sheets, atau Notion untuk pelaporan performa garapan.
                </p>
              </div>
              <ButtonSecondary
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="w-full !py-2 text-caption inline-flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingCsv ? "Memproses CSV..." : "Unduh File CSV"}</span>
              </ButtonSecondary>
            </div>
          </div>
        </CardBase>
      )}

      {/* TAB 5: ZONA BAHAYA */}
      {activeTab === "danger" && (
        <div className="space-y-4">
          <CardBase className="border-status-overdue/40 space-y-4">
            <div className="flex items-center gap-2 text-status-overdue">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-app-section-title font-semibold">
                Zona Bahaya (Danger Zone)
              </h2>
            </div>
            <p className="text-body-sm text-text-secondary">
              Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan. Harap pastikan Anda telah mengunduh backup data sebelum melanjutkan.
            </p>

            {dangerMsg && (
              <div
                className={`p-3 rounded-md text-caption ${
                  dangerMsg.type === "success"
                    ? "bg-status-completed/10 border border-status-completed/30 text-status-completed"
                    : "bg-status-overdue/10 border border-status-overdue/30 text-status-overdue"
                }`}
              >
                {dangerMsg.text}
              </div>
            )}

            {/* Action 1: Bersihkan Task Selesai */}
            <div className="p-4 rounded-lg bg-bg-elevated-2 border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-body-sm font-semibold text-text-primary">
                  Bersihkan Tugas yang Sudah Selesai
                </h3>
                <p className="text-caption text-text-tertiary">
                  Hanya menghapus task yang statusnya sudah centang hijau (done) di seluruh proyek.
                </p>
              </div>
              <ButtonSecondary
                onClick={handleClearCompletedTasks}
                className="shrink-0 text-caption !py-1.5 !px-3"
              >
                Bersihkan Task Selesai
              </ButtonSecondary>
            </div>

            {/* Action 2: Hapus Seluruh Data Proyek */}
            <div className="p-4 rounded-lg bg-status-overdue/5 border border-status-overdue/30 space-y-3">
              <div>
                <h3 className="text-body-sm font-semibold text-status-overdue">
                  Hapus Seluruh Data Proyek & Task
                </h3>
                <p className="text-caption text-text-secondary">
                  Menghapus semua daftar proyek, checklist task, dan jadwal pengingat di akun ini dari Supabase.
                </p>
              </div>

              <div className="pt-1 space-y-2">
                <label className="block text-caption text-text-secondary">
                  Ketik <strong className="text-text-primary font-mono font-bold">HAPUS</strong> untuk mengonfirmasi:
                </label>
                <div className="flex items-center gap-2 max-w-sm">
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Ketik HAPUS"
                    className="!h-9 text-caption font-mono"
                  />
                  <ButtonDanger
                    onClick={handleDeleteAllProjects}
                    disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== "HAPUS"}
                    className="shrink-0 !py-1.5 !px-3 text-caption inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? "Menghapus..." : "Hapus Semua"}</span>
                  </ButtonDanger>
                </div>
              </div>
            </div>
          </CardBase>
        </div>
      )}
    </div>
  );
}
