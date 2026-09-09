"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
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
  Languages,
  Globe,
  RotateCcw,
  CheckCheck,
  ShieldCheck,
  FolderGit2,
  Wallet,
  Compass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import {
  getLanguagePreference,
  setLanguagePreference,
  getEffectiveLanguage,
  type LanguagePreference,
} from "@/lib/utils/language-prefs";

type SettingsTab = "language" | "account" | "notifications" | "backup" | "danger";

interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  push: boolean;
  defaultTime: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, isEn } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("language");

  // User info state
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);

  // Stats
  const [stats, setStats] = useState({ projects: 0, folders: 0, wallets: 0 });

  // Language state
  const [langPref, setLangPref] = useState<LanguagePreference>("system");
  const [detectedSysLang, setDetectedSysLang] = useState<string>("id");
  const [langToast, setLangToast] = useState(false);

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
  const [browserPermission, setBrowserPermission] = useState<string>("default");

  // Export states
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Danger zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user info, language, notification preferences, and workspace stats
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email || "");
        setUserId(data.user.id || "");
      }
    });

    // Language
    const currentPref = getLanguagePreference();
    setLangPref(currentPref);
    if (typeof navigator !== "undefined") {
      setDetectedSysLang(navigator.language || "id-ID");
    }

    // Browser Notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }

    // Stats
    Promise.allSettled([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("folders").select("id", { count: "exact", head: true }),
      supabase.from("wallets").select("id", { count: "exact", head: true }),
    ]).then(([projRes, foldRes, wallRes]) => {
      setStats({
        projects: projRes.status === "fulfilled" ? projRes.value.count || 0 : 0,
        folders: foldRes.status === "fulfilled" ? foldRes.value.count || 0 : 0,
        wallets: wallRes.status === "fulfilled" ? wallRes.value.count || 0 : 0,
      });
    });

    try {
      const savedPrefs = localStorage.getItem("droppr-notification-prefs");
      if (savedPrefs) {
        setNotificationPrefs(JSON.parse(savedPrefs));
      }
    } catch {
      // Ignore
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

  const handleSelectLanguage = (pref: LanguagePreference) => {
    setLangPref(pref);
    setLanguagePreference(pref);
    setLangToast(true);
    setTimeout(() => setLangToast(false), 3000);
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "granted") {
        setNotificationPrefs((prev) => ({ ...prev, push: true }));
      }
    }
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
      localStorage.setItem("droppr-notification-prefs", JSON.stringify(notificationPrefs));
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
        { data: updates },
      ] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("reminders").select("*"),
        supabase.from("folders").select("*"),
        supabase.from("project_updates").select("*"),
      ]);

      const backupData = {
        app: "Droppr",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        user: { id: userId, email: userEmail },
        folders: folders || [],
        projects: projects || [],
        tasks: tasks || [],
        wallets: wallets || [],
        reminders: reminders || [],
        updates: updates || [],
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

      setExportSuccess(
        isEn
          ? "Complete JSON backup file downloaded successfully."
          : "File backup JSON lengkap berhasil diunduh."
      );
    } catch (err) {
      console.error("Export JSON failed:", err);
      alert(isEn ? "Failed to export JSON data." : "Gagal mengekspor data JSON.");
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
        [
          isEn ? "Project Name" : "Nama Project",
          "Chain",
          "Status",
          isEn ? "Total Tasks" : "Total Task",
          isEn ? "Completed Tasks" : "Task Selesai",
          isEn ? "Created Date" : "Tanggal Dibuat",
        ],
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
          `"${new Date(p.created_at).toLocaleDateString(isEn ? "en-US" : "id-ID")}"`,
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

      setExportSuccess(
        isEn
          ? "Project summary CSV file downloaded successfully."
          : "File CSV ringkasan project berhasil diunduh."
      );
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert(isEn ? "Failed to export CSV." : "Gagal mengekspor CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleClearCompletedTasks = async () => {
    const confirmPrompt = isEn
      ? "Delete all tasks with status 'Done'? Incomplete tasks will be kept."
      : "Hapus semua tugas yang sudah berstatus 'Selesai'? Tugas yang belum selesai akan tetap disimpan.";
    if (!confirm(confirmPrompt)) {
      return;
    }
    setDangerMsg(null);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.from("tasks").delete().eq("status", "done");
      if (error) throw error;
      setDangerMsg({
        type: "success",
        text: isEn
          ? "All completed tasks have been cleared."
          : "Seluruh tugas yang selesai berhasil dibersihkan.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerMsg({
        type: "error",
        text: err?.message || (isEn ? "Failed to clear completed tasks." : "Gagal membersihkan tugas selesai."),
      });
    }
  };

  const handleResetFeedImportStatus = async () => {
    const confirmPrompt = isEn
      ? "Reset Telegram feed import status? Signals previously deleted from your workspace can be imported again."
      : "Reset status import feed Telegram? Sinyal yang pernah kamu hapus dari garapan akan bisa di-import ulang.";
    if (!confirm(confirmPrompt)) {
      return;
    }
    setDangerMsg(null);
    try {
      const supabase = createClient() as any;
      await Promise.allSettled([
        supabase.from("airdrop_feeds").update({ is_imported: false }).eq("is_imported", true),
        supabase.from("waitlists").update({ is_imported: false }).eq("is_imported", true),
      ]);
      setDangerMsg({
        type: "success",
        text: isEn
          ? "Feed & waitlist import status has been reset. You can add them again from the Feed."
          : "Status import feed & waitlist berhasil di-reset. Kamu bisa menambahkan ulang dari Feed.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerMsg({
        type: "error",
        text: err?.message || (isEn ? "Failed to reset feed status." : "Gagal me-reset status feed."),
      });
    }
  };

  const handleDeleteAllProjects = async () => {
    const isConfirmed = ["HAPUS", "DELETE"].includes(deleteConfirmText.trim().toUpperCase());
    if (!isConfirmed) {
      setDangerMsg({
        type: "error",
        text: isEn
          ? 'Type "DELETE" to confirm deleting all data.'
          : 'Ketik kata "HAPUS" secara persis untuk konfirmasi penghapusan seluruh data.',
      });
      return;
    }

    setIsDeleting(true);
    setDangerMsg(null);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase
        .from("projects")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;

      await Promise.allSettled([
        supabase.from("airdrop_feeds").update({ is_imported: false }).eq("is_imported", true),
        supabase.from("waitlists").update({ is_imported: false }).eq("is_imported", true),
      ]);

      setDeleteConfirmText("");
      setDangerMsg({
        type: "success",
        text: isEn
          ? "All projects and associated tasks have been deleted."
          : "Seluruh proyek dan tugas turunan berhasil dihapus.",
      });
      router.refresh();
    } catch (err: any) {
      setDangerMsg({
        type: "error",
        text: err?.message || (isEn ? "Failed to delete project data." : "Gagal menghapus data proyek."),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const effectiveLang = getEffectiveLanguage(langPref);

  return (
    <div className="w-full space-y-6 max-w-5xl pb-16 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Quick Workspace Stats Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            <span>{stats.projects} {isEn ? "Projects" : "Proyek"}</span>
          </span>
          <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-link-teal" />
            <span>{stats.wallets} Wallet</span>
          </span>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab("language")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all shrink-0 border ${
            activeTab === "language"
              ? "bg-accent/20 text-accent border-accent/40 shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>{t("settings.tabs.language")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all shrink-0 border ${
            activeTab === "account"
              ? "bg-white/[0.08] text-text-primary border-white/[0.2] shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t("settings.tabs.account")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all shrink-0 border ${
            activeTab === "notifications"
              ? "bg-white/[0.08] text-text-primary border-white/[0.2] shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t("settings.tabs.notifications")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all shrink-0 border ${
            activeTab === "backup"
              ? "bg-white/[0.08] text-text-primary border-white/[0.2] shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{t("settings.tabs.backup")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("danger")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all shrink-0 border ${
            activeTab === "danger"
              ? "bg-status-overdue/20 text-status-overdue border-status-overdue/40 shadow-xs"
              : "text-text-secondary hover:text-status-overdue hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{t("settings.tabs.danger")}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BAHASA & TERJEMAHAN                               */}
      {/* ======================================================== */}
      {activeTab === "language" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/25">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary">
                    {isEn ? "Language & Smart Translation Preferences" : "Preferensi Bahasa & Terjemahan Cerdas"}
                  </h2>
                  <p className="text-caption text-text-secondary mt-0.5">
                    {isEn
                      ? "Set default translation target for Telegram posts and airdrop guides."
                      : "Tentukan target terjemahan default untuk pesan Telegram dan panduan garapan airdrop."}
                  </p>
                </div>
              </div>

              {langToast && (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-caption font-semibold animate-in fade-in flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEn ? "Saved" : "Tersimpan"}</span>
                </span>
              )}
            </div>

            {/* 3 Interactive Language Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {/* Option 1: Auto / System */}
              <div
                onClick={() => handleSelectLanguage("system")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  langPref === "system"
                    ? "bg-accent/[0.08] border-accent/60 ring-1 ring-accent/60 shadow-lg shadow-accent/10"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-accent">
                    <Globe className="w-4 h-4" />
                  </div>
                  {langPref === "system" && (
                    <span className="w-5 h-5 rounded-full bg-accent text-on-accent flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-body-sm font-bold text-text-primary flex items-center gap-1.5">
                    <span>{isEn ? "Automatic (System)" : "Otomatis (Sistem)"}</span>
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {isEn
                      ? `Follows device locale: ${detectedSysLang.toUpperCase()} (Active: ${effectiveLang === "id" ? "Indonesian" : "English"}).`
                      : `Mengikuti region perangkat: ${detectedSysLang.toUpperCase()} (Aktif: ${effectiveLang === "id" ? "Indonesia" : "English"}).`}
                  </p>
                </div>
              </div>

              {/* Option 2: English (EN) */}
              <div
                onClick={() => handleSelectLanguage("en")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  langPref === "en"
                    ? "bg-accent/[0.08] border-accent/60 ring-1 ring-accent/60 shadow-lg shadow-accent/10"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🇺🇸</span>
                  {langPref === "en" && (
                    <span className="w-5 h-5 rounded-full bg-accent text-on-accent flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-body-sm font-bold text-text-primary">
                    English (EN)
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {isEn
                      ? "Default translation to English. Posts in Indonesian will be translated to English."
                      : "Default terjemahan ke Bahasa Inggris. Postingan berbahasa Indonesia otomatis dialihkan ke Inggris."}
                  </p>
                </div>
              </div>

              {/* Option 3: Indonesian (ID) */}
              <div
                onClick={() => handleSelectLanguage("id")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  langPref === "id"
                    ? "bg-accent/[0.08] border-accent/60 ring-1 ring-accent/60 shadow-lg shadow-accent/10"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🇮🇩</span>
                  {langPref === "id" && (
                    <span className="w-5 h-5 rounded-full bg-accent text-on-accent flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-body-sm font-bold text-text-primary">
                    Bahasa Indonesia (ID)
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {isEn
                      ? "Default translation to Indonesian. Indonesian posts offer translation to English."
                      : "Default terjemahan ke Indonesia. Postingan berbahasa Indonesia otomatis ditawarkan terjemahan ke Inggris."}
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Dual-Way Explanation Banner */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <h4 className="text-caption font-bold text-text-primary flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-link-teal" />
                <span>{isEn ? "How Dual-Way Detection & Translation Works" : "Cara Kerja Deteksi & Terjemahan Dua Arah (Dual-Way)"}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-text-secondary leading-relaxed pt-1">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-semibold text-text-primary flex items-center gap-1.5">
                    <span>{isEn ? "📩 Original Indonesian Post" : "📩 Postingan Asli Bahasa Indonesia"}</span>
                  </div>
                  <p>
                    {isEn
                      ? 'The translation button automatically switches to '
                      : 'Tombol terjemahan otomatis berubah menjadi '}
                    <strong className="text-accent font-mono">&quot;Translate to English&quot;</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-semibold text-text-primary flex items-center gap-1.5">
                    <span>{isEn ? "🌍 Original English / Foreign Post" : "🌍 Postingan Asli Bahasa Inggris / Asing"}</span>
                  </div>
                  <p>
                    {isEn
                      ? 'The translation button automatically switches to '
                      : 'Tombol terjemahan otomatis berubah menjadi '}
                    <strong className="text-link-teal font-mono">{isEn ? '&quot;Translate to Indonesian&quot;' : '&quot;Terjemahkan ke Indonesia&quot;'}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AKUN & KEAMANAN                                   */}
      {/* ======================================================== */}
      {activeTab === "account" && (
        <div className="space-y-4">
          {/* User Info Card */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/25">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary">
                  {isEn ? "User Identity" : "Identitas Pengguna"}
                </h2>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Authenticated Supabase account and active session info." : "Informasi akun Supabase terautentikasi dan sesi aktif saat ini."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-[11px] font-mono text-text-tertiary">{isEn ? "Registered Email" : "Email Terdaftar"}</span>
                <p className="text-body-sm font-semibold text-text-primary font-mono truncate">
                  {userEmail || (isEn ? "Loading..." : "Memuat...")}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-tertiary">{isEn ? "Supabase User ID" : "User ID Supabase"}</span>
                  <button
                    type="button"
                    onClick={handleCopyUserId}
                    className="text-[10px] text-accent hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? (isEn ? "Copied" : "Tersalin") : (isEn ? "Copy" : "Salin")}</span>
                  </button>
                </div>
                <p className="text-[11px] font-mono text-text-secondary truncate">
                  {userId || (isEn ? "Loading..." : "Memuat...")}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-body-sm font-semibold text-text-primary">{isEn ? "Active Session" : "Sesi Login"}</div>
                <div className="text-caption text-text-secondary">
                  {isEn ? "Sign out of your Droppr session on this browser." : "Keluar dari sesi Droppr pada browser ini."}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3.5 py-2 rounded-xl bg-status-overdue/15 hover:bg-status-overdue/25 border border-status-overdue/30 text-status-overdue text-caption font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isEn ? "Sign Out" : "Keluar Akun"}</span>
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-link-teal/15 text-link-teal border border-link-teal/25">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary">
                  {isEn ? "Update Password" : "Perbarui Kata Sandi"}
                </h2>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Change Supabase account password to keep your workspace secure." : "Ubah password akun Supabase untuk menjaga keamanan workspace Anda."}
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-caption flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-status-overdue/15 border border-status-overdue/30 text-status-overdue text-caption flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md pt-1">
              <div>
                <label className="block text-caption font-medium text-text-secondary mb-1">
                  {isEn ? "New Password (Min. 6 Characters)" : "Password Baru (Min. 6 Karakter)"}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/60"
                />
              </div>

              <div>
                <label className="block text-caption font-medium text-text-secondary mb-1">
                  {isEn ? "Repeat New Password" : "Ulangi Password Baru"}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/60"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed disabled:opacity-50 text-caption font-semibold transition-all shadow-md shadow-accent/20"
                >
                  {passwordLoading ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save New Password" : "Simpan Password Baru")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: OPERASIONAL & NOTIFIKASI                          */}
      {/* ======================================================== */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary">
                    {isEn ? "Operational Schedule & Reminders" : "Jadwal Operasional & Pengingat"}
                  </h2>
                  <p className="text-caption text-text-secondary">
                    {isEn
                      ? "Daily reset cycle standards and task notification channel preferences."
                      : "Standar siklus reset harian dan preferensi saluran notifikasi garapan."}
                  </p>
                </div>
              </div>

              {notifSaved && (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-caption font-semibold animate-in fade-in flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEn ? "Saved" : "Tersimpan"}</span>
                </span>
              )}
            </div>

            {/* Daily Reset Info Card */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-caption font-bold text-amber-400">
                  {isEn ? "Daily Task Reset Cycle" : "Siklus Reset Garapan Harian (Daily Task Reset)"}
                </div>
                <p className="text-[11px] text-text-secondary">
                  {isEn ? (
                    <>
                      Every day at <strong className="text-text-primary font-mono">07:00 WIB (00:00 UTC)</strong>, the completion status of recurring daily tasks will automatically reset for the new day&apos;s cycle.
                    </>
                  ) : (
                    <>
                      Setiap hari pukul <strong className="text-text-primary font-mono">07:00 WIB (00:00 UTC)</strong>, status pengerjaan tugas rutin harian akan otomatis di-reset untuk siklus hari baru.
                    </>
                  )}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-mono shrink-0">
                {isEn ? "Reset: 07:00 WIB" : "Reset: 07:00 WIB"}
              </span>
            </div>

            <form onSubmit={handleSaveNotificationPrefs} className="space-y-4 pt-1">
              <div className="space-y-2">
                <label className="block text-caption font-semibold text-text-secondary">
                  {isEn ? "Notification Channels" : "Saluran Notifikasi"}
                </label>

                {/* In-app */}
                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors select-none">
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
                      {isEn ? "In-App Dashboard Notification (Active)" : "In-App Dashboard Notification (Aktif)"}
                    </div>
                    <div className="text-caption text-text-tertiary">
                      {isEn
                        ? "Automated reminders appear in the Command Center Dashboard when tasks are due."
                        : "Pengingat otomatis muncul di Command Center Dashboard saat tugas perlu dikerjakan."}
                    </div>
                  </div>
                </label>

                {/* Push browser */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
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
                        {isEn ? "Browser Push Notification" : "Browser Push Notification"}
                      </div>
                      <div className="text-caption text-text-tertiary">
                        {isEn
                          ? "Desktop pop-up notifications while the browser is running."
                          : "Pemberitahuan pop-up desktop saat peramban sedang berjalan."}
                      </div>
                    </div>
                  </label>

                  {browserPermission !== "granted" && (
                    <button
                      type="button"
                      onClick={handleRequestPushPermission}
                      className="text-[11px] font-semibold text-accent hover:underline px-2 py-1 rounded bg-accent/10 border border-accent/20 shrink-0"
                    >
                      {isEn ? "Allow Browser" : "Izinkan Browser"}
                    </button>
                  )}
                </div>
              </div>

              {/* Default notification time */}
              <div>
                <label className="block text-caption font-semibold text-text-secondary mb-1">
                  {isEn ? "Default Daily Routine Reminder Time" : "Jam Pengingat Rutin Harian Default"}
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Clock className="w-4 h-4 text-text-tertiary" />
                  <select
                    value={notificationPrefs.defaultTime}
                    onChange={(e) =>
                      setNotificationPrefs({
                        ...notificationPrefs,
                        defaultTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-body-sm text-text-primary focus:outline-none focus:border-accent font-mono"
                  >
                    <option value="07:00" className="bg-[#0e131b] text-text-primary">
                      {isEn ? "07:00 WIB (Early Morning - Reset Time)" : "07:00 WIB (Pagi Awal - Saat Reset)"}
                    </option>
                    <option value="09:00" className="bg-[#0e131b] text-text-primary">
                      {isEn ? "09:00 WIB (Morning - Standard)" : "09:00 WIB (Pagi Hari - Standar)"}
                    </option>
                    <option value="12:00" className="bg-[#0e131b] text-text-primary">
                      {isEn ? "12:00 WIB (Noon)" : "12:00 WIB (Siang)"}
                    </option>
                    <option value="18:00" className="bg-[#0e131b] text-text-primary">
                      {isEn ? "18:00 WIB (Evening)" : "18:00 WIB (Sore)"}
                    </option>
                    <option value="21:00" className="bg-[#0e131b] text-text-primary">
                      {isEn ? "21:00 WIB (Night)" : "21:00 WIB (Malam Hari)"}
                    </option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-md shadow-accent/20"
                >
                  {isEn ? "Save Notification Settings" : "Simpan Pengaturan Notifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BACKUP & EKSPOR DATA                              */}
      {/* ======================================================== */}
      {activeTab === "backup" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 sm:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-body-md sm:text-heading-3 font-bold text-text-primary">
                  {isEn ? "Data Sovereignty & Backups" : "Kedaulatan & Cadangan Data"}
                </h2>
                <p className="text-caption text-text-secondary">
                  {isEn
                    ? "Download your complete farming database, folders, update timeline, and wallets independently at any time."
                    : "Unduh seluruh database garapan, folder, linimasa pembaruan, dan wallet Anda secara mandiri kapan saja."}
                </p>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-caption flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Full JSON Dump */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-text-primary font-bold text-body-sm">
                    <FileJson className="w-4 h-4 text-accent" />
                    <span>{isEn ? "Complete Backup (JSON)" : "Cadangan Lengkap (JSON)"}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {isEn
                      ? "Saves 100% of your folders, projects, tasks, timeline logs, reminders, and wallets hierarchy to restore or archive."
                      : "Menyimpan 100% struktur hierarki folder, proyek, tugas, catatan linimasa, pengingat, dan wallet untuk di-restore atau diarsipkan."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={isExportingJson}
                  className="w-full py-2 px-3 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed disabled:opacity-50 text-caption font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-md shadow-accent/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingJson
                      ? (isEn ? "Creating Backup..." : "Membuat Cadangan...")
                      : (isEn ? "Download JSON Backup" : "Unduh Backup JSON")}
                  </span>
                </button>
              </div>

              {/* CSV Spreadsheet */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-text-primary font-bold text-body-sm">
                    <FileSpreadsheet className="w-4 h-4 text-link-teal" />
                    <span>{isEn ? "Table Summary (CSV)" : "Ringkasan Tabel (CSV)"}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {isEn
                      ? "Airdrop project summary table and task progress compatible directly with Microsoft Excel, Google Sheets, or Notion."
                      : "Tabel ringkasan proyek garapan dan progress tugas yang kompatibel langsung dengan Microsoft Excel, Google Sheets, atau Notion."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isExportingCsv}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.04] text-text-primary hover:bg-white/[0.08] border border-white/[0.1] disabled:opacity-50 text-caption font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingCsv
                      ? (isEn ? "Processing CSV..." : "Memproses CSV...")
                      : (isEn ? "Download CSV File" : "Unduh File CSV")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ZONA BAHAYA & PEMELIHARAAN                        */}
      {/* ======================================================== */}
      {activeTab === "danger" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 sm:p-6 bg-status-overdue/[0.04] border border-status-overdue/30 backdrop-blur-xl shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center gap-2.5 text-status-overdue">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h2 className="text-body-md sm:text-heading-3 font-bold">
                  {isEn ? "Danger Zone & Database Maintenance" : "Zona Bahaya & Pemeliharaan Database"}
                </h2>
                <p className="text-caption text-text-secondary">
                  {isEn
                    ? "Permanent data cleanup and deletion actions. Make sure you have created a JSON backup before proceeding."
                    : "Aksi pembersihan dan penghapusan data permanen. Pastikan Anda telah membuat backup JSON sebelum melanjutkan."}
                </p>
              </div>
            </div>

            {dangerMsg && (
              <div
                className={`p-3 rounded-xl text-caption flex items-center gap-2 ${
                  dangerMsg.type === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-status-overdue/15 border border-status-overdue/30 text-status-overdue"
                }`}
              >
                {dangerMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{dangerMsg.text}</span>
              </div>
            )}

            {/* Action 1: Bersihkan Task Selesai */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-body-sm font-bold text-text-primary">
                  {isEn ? "Clear Completed Tasks" : "Bersihkan Tugas yang Sudah Selesai"}
                </div>
                <p className="text-caption text-text-tertiary">
                  {isEn
                    ? "Delete old tasks whose status is already completed (done) in the database to keep it lightweight."
                    : "Menghapus tugas lama yang statusnya sudah selesai (done) di database agar ringan."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCompletedTasks}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-text-secondary hover:text-text-primary text-caption font-semibold transition-all shrink-0"
              >
                {isEn ? "Clear Completed Tasks" : "Bersihkan Tugas Selesai"}
              </button>
            </div>

            {/* Action 2: Reset Status Feed Telegram */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-body-sm font-bold text-text-primary">
                  {isEn ? "Reset Signal Feed Import Status" : "Reset Status Import Feed Sinyal"}
                </div>
                <p className="text-caption text-text-tertiary">
                  {isEn
                    ? "Reset feed/waitlist signals status so previously removed posts can be imported again."
                    : "Mengembalikan status sinyal feed/waitlist sehingga postingan yang pernah dihapus dapat ditambahkan kembali."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFeedImportStatus}
                className="px-3.5 py-1.5 rounded-xl bg-link-teal/15 hover:bg-link-teal/25 border border-link-teal/30 text-link-teal text-caption font-semibold transition-all shrink-0"
              >
                {isEn ? "Reset Feed Signals" : "Reset Sinyal Feed"}
              </button>
            </div>

            {/* Action 3: Hapus Seluruh Proyek */}
            <div className="p-4 rounded-xl bg-status-overdue/10 border border-status-overdue/30 space-y-3">
              <div>
                <div className="text-body-sm font-bold text-status-overdue">
                  {isEn ? "Delete All Farming Data & Projects" : "Hapus Seluruh Data Garapan & Proyek"}
                </div>
                <p className="text-caption text-text-secondary">
                  {isEn
                    ? "Permanently delete ALL projects, timeline notes, and tasks in this account from Supabase."
                    : "Menghapus SEMUA proyek, catatan linimasa, dan tugas di akun ini dari Supabase."}
                </p>
              </div>

              <div className="pt-1 space-y-2">
                <label className="block text-caption text-text-secondary">
                  {isEn ? (
                    <>
                      Type <strong className="text-text-primary font-mono font-bold">DELETE</strong> to confirm:
                    </>
                  ) : (
                    <>
                      Ketik <strong className="text-text-primary font-mono font-bold">HAPUS</strong> untuk mengonfirmasi:
                    </>
                  )}
                </label>
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={isEn ? "Type DELETE" : "Ketik HAPUS"}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.1] text-caption font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-status-overdue"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteAllProjects}
                    disabled={isDeleting || !["HAPUS", "DELETE"].includes(deleteConfirmText.trim().toUpperCase())}
                    className="px-3.5 py-1.5 rounded-xl bg-status-overdue text-white hover:bg-status-overdue/90 disabled:opacity-40 text-caption font-semibold transition-all shrink-0 inline-flex items-center gap-1.5 shadow-md shadow-status-overdue/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? (isEn ? "Deleting..." : "Menghapus...") : (isEn ? "Delete All" : "Hapus Semua")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
