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
  FileJson,
  FileSpreadsheet,
  Clock,
  KeyRound,
  Trash2,
  Languages,
  Globe,
  FolderGit2,
  Wallet,
  Shield,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CustomSelect } from "@/components/ui/select";
import { ConfirmModal, type ConfirmModalState } from "@/components/ui/confirm-modal";
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

// Minimalist modern iOS/Linear style toggle switch
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-accent" : "bg-bg-elevated-2 border-border-hairline"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out ${
          checked
            ? "translate-x-5 bg-on-accent"
            : "translate-x-0.5 bg-text-tertiary"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, isEn } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("language");

  // User info state
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);

  // Workspace stats
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

  // Centralized styled confirm modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    description: "",
  });

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
    setTimeout(() => setLangToast(false), 2500);
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "granted") {
        updateNotificationPref("push", true);
      }
    }
  };

  const updateNotificationPref = (key: keyof NotificationPrefs, value: any) => {
    const updated = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(updated);
    try {
      localStorage.setItem("droppr-notification-prefs", JSON.stringify(updated));
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save prefs:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError(
        isEn
          ? "New password must be at least 6 characters."
          : "Password baru harus minimal 6 karakter."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        isEn
          ? "Password confirmation does not match."
          : "Konfirmasi password tidak cocok."
      );
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(
        isEn
          ? "Password updated successfully."
          : "Password berhasil diperbarui. Gunakan password baru untuk login berikutnya."
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err?.message || (isEn ? "Failed to update password." : "Gagal mengubah password.")
      );
    } finally {
      setPasswordLoading(false);
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
          ? "Full JSON backup file downloaded."
          : "File backup JSON lengkap berhasil diunduh."
      );
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error("Export JSON failed:", err);
      setConfirmModal({
        isOpen: true,
        isAlert: true,
        title: isEn ? "Export Failed" : "Ekspor Gagal",
        description: isEn ? "Failed to export JSON data." : "Gagal mengekspor data JSON.",
        variant: "danger",
        confirmLabel: "OK",
      });
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
          ? "Project summary CSV file downloaded."
          : "File CSV ringkasan project berhasil diunduh."
      );
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error("Export CSV failed:", err);
      setConfirmModal({
        isOpen: true,
        isAlert: true,
        title: isEn ? "Export Failed" : "Ekspor Gagal",
        description: isEn ? "Failed to export CSV." : "Gagal mengekspor CSV.",
        variant: "danger",
        confirmLabel: "OK",
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleClearCompletedTasks = () => {
    const confirmPrompt = isEn
      ? "Delete all tasks with status 'Done'? Incomplete tasks will be kept."
      : "Hapus semua tugas yang sudah berstatus 'Selesai'? Tugas yang belum selesai akan tetap disimpan.";

    setConfirmModal({
      isOpen: true,
      title: isEn ? "Clear Completed Tasks" : "Bersihkan Tugas Selesai",
      description: confirmPrompt,
      confirmLabel: isEn ? "Clear" : "Bersihkan",
      cancelLabel: isEn ? "Cancel" : "Batal",
      variant: "danger",
      onConfirm: async () => {
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
      },
    });
  };

  const handleResetFeedImportStatus = () => {
    const confirmPrompt = isEn
      ? "Reset Telegram feed import status? Signals previously deleted from your workspace can be imported again."
      : "Reset status import feed Telegram? Sinyal yang pernah kamu hapus dari garapan akan bisa di-import ulang.";

    setConfirmModal({
      isOpen: true,
      title: isEn ? "Reset Import Status" : "Reset Status Import",
      description: confirmPrompt,
      confirmLabel: isEn ? "Reset" : "Reset",
      cancelLabel: isEn ? "Cancel" : "Batal",
      variant: "warning",
      onConfirm: async () => {
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
      },
    });
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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "language", label: isEn ? "Language" : "Bahasa", icon: <Languages className="w-4 h-4" /> },
    { id: "account", label: isEn ? "Account" : "Akun", icon: <User className="w-4 h-4" /> },
    { id: "notifications", label: isEn ? "Notifications" : "Notifikasi", icon: <Bell className="w-4 h-4" /> },
    { id: "backup", label: isEn ? "Backup" : "Cadangan", icon: <Download className="w-4 h-4" /> },
    { id: "danger", label: isEn ? "Danger Zone" : "Zona Bahaya", icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      {/* HEADER SECTION (CLEAN & MINIMALIST) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-hairline">
        <div>
          <h1 className="text-heading-2 font-bold text-text-primary tracking-tight">
            {t("settings.title") || (isEn ? "Settings" : "Pengaturan")}
          </h1>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {isEn
              ? "Preferences, account security, notification schedules, and workspace data."
              : "Kelola preferensi bahasa, akun, jadwal operasional, dan cadangan data garapan."}
          </p>
        </div>

        {/* Workspace summary counter */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-hairline text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            <span>{stats.projects} {isEn ? "Projects" : "Proyek"}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-hairline text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-link-teal" />
            <span>{stats.wallets} Wallet</span>
          </span>
        </div>
      </div>

      {/* COMPACT SEGMENTED TABS BAR */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-elevated/80 border border-border-hairline overflow-x-auto no-scrollbar max-w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDanger = tab.id === "danger";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 whitespace-nowrap ${
                isActive
                  ? isDanger
                    ? "bg-status-overdue text-white shadow-xs"
                    : "bg-accent text-on-accent shadow-xs"
                  : isDanger
                  ? "text-status-overdue/80 hover:text-status-overdue hover:bg-status-overdue/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BAHASA & TERJEMAHAN                               */}
      {/* ======================================================== */}
      {activeTab === "language" && (
        <div className="space-y-4">
          <div className="bg-bg-elevated/70 border border-border-hairline rounded-2xl overflow-hidden divide-y divide-border-hairline">
            {/* Setting Row 1: Target Language */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-2">
                  <Languages className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Interface & Translation Language" : "Bahasa Antarmuka & Terjemahan"}</span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Controls the app language and default translation target for Telegram airdrop signals."
                    : "Menentukan bahasa antarmuka aplikasi dan target terjemahan sinyal garapan Telegram."}
                </p>
              </div>

              {/* Segmented 3-Way Pill Switch */}
              <div className="flex items-center p-1 rounded-xl bg-bg-base border border-border-hairline shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("system")}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all flex items-center gap-1.5 ${
                    langPref === "system"
                      ? "bg-accent text-on-accent shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  title={`Device region: ${detectedSysLang.toUpperCase()}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{isEn ? "Auto (System)" : "Otomatis"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLanguage("en")}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all flex items-center gap-1.5 ${
                    langPref === "en"
                      ? "bg-accent text-on-accent shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span>🇺🇸 English</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLanguage("id")}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all flex items-center gap-1.5 ${
                    langPref === "id"
                      ? "bg-accent text-on-accent shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span>🇮🇩 Indonesia</span>
                </button>
              </div>
            </div>

            {/* Setting Row 2: Smart Dual-Way Translation */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-link-teal" />
                  <span>{isEn ? "Smart Dual-Way Translation" : "Terjemahan Cerdas Dua Arah (Dual-Way)"}</span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Indonesian posts offer translation to English; English/foreign posts offer translation to Indonesian."
                    : "Postingan berbahasa Indonesia otomatis ditawari terjemahan ke Inggris; postingan asing ke Indonesia."}
                </p>
              </div>

              <div className="shrink-0">
                <span className="px-3 py-1 rounded-lg bg-link-teal/10 border border-link-teal/25 text-link-teal text-caption font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-link-teal animate-pulse" />
                  <span>ID ⇄ EN Aktif</span>
                </span>
              </div>
            </div>
          </div>

          {langToast && (
            <div className="p-3 rounded-xl bg-status-completed/10 border border-status-completed/25 text-status-completed text-caption font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{isEn ? "Language preference saved." : "Preferensi bahasa berhasil disimpan."}</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AKUN & KEAMANAN                                   */}
      {/* ======================================================== */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Section 1: User Profile & Session */}
          <div className="bg-bg-elevated/70 border border-border-hairline rounded-2xl overflow-hidden divide-y divide-border-hairline">
            {/* Row 1: Email */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-body-sm font-semibold text-text-primary">{isEn ? "Email Address" : "Email Terdaftar"}</div>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Your authenticated Supabase identity." : "Identitas akun Anda yang terhubung dengan database."}
                </p>
              </div>
              <span className="font-mono text-body-sm text-text-primary font-semibold bg-bg-base px-3 py-1.5 rounded-xl border border-border-hairline">
                {userEmail || "—"}
              </span>
            </div>

            {/* Row 2: User ID */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-body-sm font-semibold text-text-primary">{isEn ? "Account ID" : "User ID Akun"}</div>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Unique account identifier (UUID) for RLS data isolation." : "Pengenal unik akun untuk isolasi baris data (RLS)."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-text-tertiary bg-bg-base px-2.5 py-1.5 rounded-lg border border-border-hairline max-w-[200px] sm:max-w-xs truncate">
                  {userId || "—"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="px-2.5 py-1.5 rounded-lg bg-bg-elevated-2 hover:bg-bg-base border border-border-hairline text-caption font-semibold text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 shrink-0"
                  title={isEn ? "Copy User ID" : "Salin User ID"}
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-status-completed" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? (isEn ? "Copied" : "Tersalin") : (isEn ? "Copy" : "Salin")}</span>
                </button>
              </div>
            </div>

            {/* Row 3: Sign Out */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-body-sm font-semibold text-text-primary">{isEn ? "Active Session" : "Sesi Akun"}</div>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Sign out of your account on this device." : "Keluar dari sesi workspace Droppr pada browser ini."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl bg-status-overdue/10 hover:bg-status-overdue/20 border border-status-overdue/25 text-status-overdue text-caption font-semibold transition-all inline-flex items-center gap-1.5 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isEn ? "Sign Out" : "Keluar Akun"}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Change Password */}
          <div className="bg-bg-elevated/70 border border-border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-link-teal/15 text-link-teal border border-link-teal/25">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-body-md font-semibold text-text-primary">
                  {isEn ? "Update Password" : "Perbarui Kata Sandi"}
                </h3>
                <p className="text-caption text-text-secondary">
                  {isEn ? "Enter a new password for future logins." : "Masukkan kata sandi baru untuk login berikutnya."}
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-status-completed/10 border border-status-completed/25 text-status-completed text-caption flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-status-overdue/10 border border-status-overdue/25 text-status-overdue text-caption flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md pt-1">
              <div>
                <label className="block text-caption font-medium text-text-secondary mb-1">
                  {isEn ? "New Password" : "Password Baru (Min. 6 Karakter)"}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-base border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-caption font-medium text-text-secondary mb-1">
                  {isEn ? "Confirm Password" : "Ulangi Password Baru"}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-base border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed disabled:opacity-50 text-caption font-semibold transition-all shadow-md shadow-accent/20 inline-flex items-center gap-1.5"
                >
                  {passwordLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{passwordLoading ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save Password" : "Simpan Password Baru")}</span>
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
          <div className="bg-bg-elevated/70 border border-border-hairline rounded-2xl overflow-hidden divide-y divide-border-hairline">
            {/* Row 1: Daily Reset Cycle Info */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Daily Routine Reset Cycle" : "Siklus Reset Rutinitas Harian"}</span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Recurring daily tasks automatically reset each day at 07:00 WIB (00:00 UTC)."
                    : "Tugas garapan rutin harian otomatis di-reset untuk siklus hari baru setiap pukul 07:00 WIB."}
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-accent/10 border border-accent/25 text-accent text-caption font-mono font-semibold shrink-0">
                07:00 WIB (00:00 UTC)
              </span>
            </div>

            {/* Row 2: In-App Dashboard Reminders */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "In-App Dashboard Alerts" : "Notifikasi Dashboard (In-App)"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Show reminder badges in the Command Center Dashboard when tasks are due."
                    : "Tampilkan badge pengingat tugas aktif pada Command Center Dashboard."}
                </p>
              </div>
              <ToggleSwitch
                checked={notificationPrefs.inApp}
                onChange={(checked) => updateNotificationPref("inApp", checked)}
              />
            </div>

            {/* Row 3: Browser Push Notifications */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Desktop Browser Push" : "Notifikasi Pop-up Browser"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Receive browser alert notifications while your browser is open."
                    : "Kirimkan notifikasi desktop saat browser sedang berjalan."}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {browserPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={handleRequestPushPermission}
                    className="text-[11px] font-semibold text-accent hover:underline px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20"
                  >
                    {isEn ? "Allow Permission" : "Izinkan Browser"}
                  </button>
                )}
                <ToggleSwitch
                  checked={notificationPrefs.push}
                  onChange={(checked) => updateNotificationPref("push", checked)}
                />
              </div>
            </div>

            {/* Row 4: Default Routine Reminder Time */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Default Daily Reminder Time" : "Waktu Pengingat Harian Default"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Standard alert time when creating new daily task reminders."
                    : "Waktu alarm standar saat mengatur pengingat harian proyek baru."}
                </p>
              </div>
              <div className="w-48 shrink-0">
                <CustomSelect
                  value={notificationPrefs.defaultTime}
                  onChange={(val) => updateNotificationPref("defaultTime", val)}
                  options={[
                    { value: "07:00", label: "07:00 WIB (Reset)" },
                    { value: "09:00", label: "09:00 WIB (Pagi)" },
                    { value: "12:00", label: "12:00 WIB (Siang)" },
                    { value: "18:00", label: "18:00 WIB (Sore)" },
                    { value: "21:00", label: "21:00 WIB (Malam)" },
                  ]}
                />
              </div>
            </div>
          </div>

          {notifSaved && (
            <div className="p-3 rounded-xl bg-status-completed/10 border border-status-completed/25 text-status-completed text-caption font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{isEn ? "Notification preferences updated." : "Pengaturan notifikasi berhasil diperbarui."}</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BACKUP & EKSPOR DATA                              */}
      {/* ======================================================== */}
      {activeTab === "backup" && (
        <div className="space-y-4">
          <div className="bg-bg-elevated/70 border border-border-hairline rounded-2xl overflow-hidden divide-y divide-border-hairline">
            {/* Row 1: Full JSON Backup */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Full Database Backup (JSON)" : "Cadangan Lengkap Database (JSON)"}</span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Export 100% of your folders, projects, tasks, timeline updates, and wallets to a single JSON archive."
                    : "Unduh seluruh struktur folder, proyek, checklist tugas, linimasa pembaruan, dan wallet ke file arsip JSON."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={isExportingJson}
                className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed disabled:opacity-50 text-caption font-semibold transition-all inline-flex items-center gap-2 shadow-md shadow-accent/20 shrink-0"
              >
                {isExportingJson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isExportingJson ? (isEn ? "Creating..." : "Membuat...") : (isEn ? "Download JSON" : "Unduh JSON")}</span>
              </button>
            </div>

            {/* Row 2: CSV Summary */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-link-teal" />
                  <span>{isEn ? "Spreadsheet Table Summary (CSV)" : "Ringkasan Lembar Kerja (CSV)"}</span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Export a project summary table compatible with Microsoft Excel, Google Sheets, or Notion."
                    : "Ekspor tabel ringkasan garapan dan status progres tugas yang kompatibel langsung dengan Excel atau Sheets."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="px-4 py-2 rounded-xl bg-bg-elevated-2 hover:bg-bg-base border border-border-hairline text-text-primary hover:border-border-hairline-strong disabled:opacity-50 text-caption font-semibold transition-all inline-flex items-center gap-2 shrink-0"
              >
                {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isExportingCsv ? (isEn ? "Processing..." : "Memproses...") : (isEn ? "Download CSV" : "Unduh CSV")}</span>
              </button>
            </div>
          </div>

          {exportSuccess && (
            <div className="p-3 rounded-xl bg-status-completed/10 border border-status-completed/25 text-status-completed text-caption font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ZONA BAHAYA & PEMELIHARAAN                        */}
      {/* ======================================================== */}
      {activeTab === "danger" && (
        <div className="space-y-4">
          <div className="bg-status-overdue/[0.03] border border-status-overdue/25 rounded-2xl overflow-hidden divide-y divide-status-overdue/20">
            {/* Header row */}
            <div className="p-4 sm:p-5 flex items-center gap-2.5 text-status-overdue">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-body-md font-semibold text-text-primary">
                  {isEn ? "Danger Zone & Maintenance" : "Zona Bahaya & Pemeliharaan Data"}
                </h3>
                <p className="text-caption text-text-secondary mt-0.5">
                  {isEn
                    ? "Irreversible operations. Please download a JSON backup before performing resets."
                    : "Aksi penghapusan dan reset data permanen. Pastikan Anda telah membuat backup JSON terlebih dahulu."}
                </p>
              </div>
            </div>

            {dangerMsg && (
              <div
                className={`p-3 text-caption flex items-center gap-2 ${
                  dangerMsg.type === "success"
                    ? "bg-status-completed/10 text-status-completed"
                    : "bg-status-overdue/10 text-status-overdue"
                }`}
              >
                {dangerMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{dangerMsg.text}</span>
              </div>
            )}

            {/* Action 1: Clear Completed Tasks */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Clear Completed Tasks" : "Bersihkan Tugas Selesai"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Delete tasks whose status is already 'Done' to keep your database lightweight."
                    : "Hapus tugas-tugas yang sudah berstatus 'Selesai' di database untuk meringankan beban akun."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCompletedTasks}
                className="px-3.5 py-1.5 rounded-xl bg-bg-elevated border border-border-hairline hover:border-status-overdue/40 text-text-secondary hover:text-status-overdue text-caption font-semibold transition-all shrink-0"
              >
                {isEn ? "Clear Completed" : "Bersihkan Selesai"}
              </button>
            </div>

            {/* Action 2: Reset Feed Import Status */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="text-body-sm font-semibold text-text-primary">
                  {isEn ? "Reset Feed Import Status" : "Reset Status Import Sinyal"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Reset signal statuses so previously dismissed feed posts can be imported again."
                    : "Kembalikan status sinyal feed agar postingan yang pernah dihapus dapat di-import kembali."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFeedImportStatus}
                className="px-3.5 py-1.5 rounded-xl bg-link-teal/10 hover:bg-link-teal/20 border border-link-teal/30 text-link-teal text-caption font-semibold transition-all shrink-0"
              >
                {isEn ? "Reset Signals" : "Reset Sinyal"}
              </button>
            </div>

            {/* Action 3: Delete All Projects */}
            <div className="p-4 sm:p-5 space-y-3 bg-status-overdue/[0.04]">
              <div className="space-y-0.5">
                <div className="text-body-sm font-semibold text-status-overdue">
                  {isEn ? "Delete All Projects & Data" : "Hapus Seluruh Data Proyek"}
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {isEn
                    ? "Permanently delete ALL projects, tasks, and update timelines from this account."
                    : "Menghapus SEMUA proyek garapan, catatan linimasa, dan tugas akun ini dari database Supabase."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1 max-w-md">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={isEn ? "Type DELETE to confirm" : "Ketik HAPUS untuk konfirmasi"}
                  className="w-full sm:flex-1 px-3 py-1.5 rounded-xl bg-bg-base border border-border-hairline text-caption font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-status-overdue"
                />
                <button
                  type="button"
                  onClick={handleDeleteAllProjects}
                  disabled={isDeleting || !["HAPUS", "DELETE"].includes(deleteConfirmText.trim().toUpperCase())}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-status-overdue text-white hover:bg-status-overdue/90 disabled:opacity-40 text-caption font-semibold transition-all shrink-0 inline-flex items-center justify-center gap-1.5 shadow-md shadow-status-overdue/20"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? (isEn ? "Deleting..." : "Menghapus...") : (isEn ? "Delete All" : "Hapus Semua")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled Centralized Modal */}
      <ConfirmModal
        {...confirmModal}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
