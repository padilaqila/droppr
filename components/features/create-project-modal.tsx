"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import {
  FileText,
  Languages,
  Send,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Globe,
  AtSign,
  Wallet,
  Plus,
} from "lucide-react";
import { parseAirdropProjectData } from "@/lib/supabase/airdrop-parser";
import { getTranslationAction } from "@/lib/utils/language-prefs";
import { useTranslation } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

interface FolderOption {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: { id: string; name: string }) => void;
  initialFolderId?: string;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  initialFolderId,
}: CreateProjectModalProps) {
  const { locale } = useTranslation();
  // Input method: "telegram_link" vs "manual_paste"
  const [method, setMethod] = useState<"telegram_link" | "manual_paste">("telegram_link");

  // Form Fields - Basic Info
  const [telegramUrl, setTelegramUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [originalRawText, setOriginalRawText] = useState("");
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [folderId, setFolderId] = useState<string>(initialFolderId || "");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");

  // Form Fields - Social & Project Links
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dappUrl, setDappUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [telegramPostUrl, setTelegramPostUrl] = useState("");

  // Form Fields - Account / Identity Used
  const [accountPlatform, setAccountPlatform] = useState("Email");
  const [accountValue, setAccountValue] = useState("");

  // Form Fields - Wallets
  const [userWallets, setUserWallets] = useState<WalletRow[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);

  // Channel Source
  const [channelSource, setChannelSource] = useState<{
    channelName: string;
    channelHandle: string;
    date: string;
  } | null>(null);

  // States
  const [isFetchingTelegram, setIsFetchingTelegram] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [showSocialSection, setShowSocialSection] = useState(true);

  // Load Folders and User Wallets on open
  useEffect(() => {
    if (isOpen) {
      const supabase = createClient() as any;
      // 1. Fetch folders
      supabase
        .from("folders")
        .select("id, name")
        .order("name")
        .then(({ data }: any) => {
          if (data) setFolders(data);
        });

      // 2. Fetch wallets
      supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }: any) => {
          if (data) setUserWallets(data);
        });

      if (initialFolderId) {
        setFolderId(initialFolderId);
      }
    }
  }, [isOpen, initialFolderId]);

  // Reset all fields when modal closes
  const handleClose = () => {
    setTelegramUrl("");
    setRawText("");
    setOriginalRawText("");
    setName("");
    setChain("");
    setWebsiteUrl("");
    setDappUrl("");
    setTwitterUrl("");
    setDiscordUrl("");
    setTelegramPostUrl("");
    setAccountPlatform("Email");
    setAccountValue("");
    setSelectedWalletIds([]);
    setChannelSource(null);
    setIsTranslated(false);
    setErrorMessage(null);
    onClose();
  };

  // Toggle Wallet Selection
  const handleToggleWallet = (walletId: string) => {
    setSelectedWalletIds((prev) =>
      prev.includes(walletId) ? prev.filter((id) => id !== walletId) : [...prev, walletId]
    );
  };

  // 1. Fetch Post from Telegram Link
  const handleFetchTelegram = async () => {
    if (!telegramUrl.trim()) {
      setErrorMessage("Masukkan link postingan Telegram terlebih dahulu.");
      return;
    }

    setIsFetchingTelegram(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/telegram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: telegramUrl.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengambil postingan Telegram.");
      }

      const data = json.data;
      setRawText(data.text);
      setOriginalRawText(data.text);
      setIsTranslated(false);
      setTelegramPostUrl(data.postUrl || telegramUrl.trim());
      setChannelSource({
        channelName: data.channelName,
        channelHandle: data.channelHandle,
        date: data.date,
      });

      // Auto-extract links and name from text
      const parsed = parseAirdropProjectData(data.guessedName || "Airdrop Project", data.text);
      setName(parsed.name || data.guessedName || "");
      if (parsed.chain) setChain(parsed.chain);
      if (parsed.social_links?.website) setWebsiteUrl(parsed.social_links.website);
      if (parsed.social_links?.dapp_url) setDappUrl(parsed.social_links.dapp_url);
      if (parsed.social_links?.twitter) setTwitterUrl(parsed.social_links.twitter);
      if (parsed.social_links?.discord) setDiscordUrl(parsed.social_links.discord);
    } catch (err: any) {
      console.error("Fetch telegram error:", err);
      setErrorMessage(err?.message || "Gagal menghubungi server Telegram.");
    } finally {
      setIsFetchingTelegram(false);
    }
  };

  // 2. Handle Text Change on Manual Paste
  const handleManualTextChange = (text: string) => {
    setRawText(text);
    setOriginalRawText(text);
    setIsTranslated(false);

    if (text.trim()) {
      const parsed = parseAirdropProjectData("Airdrop Project", text);
      if (!name.trim()) {
        const firstLine = text.trim().split("\n")[0].replace(/[*_#•\-]/g, "").trim();
        if (firstLine) setName(firstLine.slice(0, 40));
      }
      if (!chain.trim() && parsed.chain) setChain(parsed.chain);
      if (!websiteUrl.trim() && parsed.social_links?.website) setWebsiteUrl(parsed.social_links.website);
      if (!dappUrl.trim() && parsed.social_links?.dapp_url) setDappUrl(parsed.social_links.dapp_url);
      if (!twitterUrl.trim() && parsed.social_links?.twitter) setTwitterUrl(parsed.social_links.twitter);
      if (!discordUrl.trim() && parsed.social_links?.discord) setDiscordUrl(parsed.social_links.discord);
    }
  };

  // 3. Translate Text to Indonesian
  const handleTranslate = async () => {
    if (!rawText.trim()) {
      setErrorMessage("Teks postingan masih kosong.");
      return;
    }

    if (isTranslated && originalRawText) {
      setRawText(originalRawText);
      setIsTranslated(false);
      return;
    }

    setIsTranslating(true);
    setErrorMessage(null);

    try {
      const action = getTranslationAction(rawText, locale, false);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          targetLang: action.targetLang,
          sourceLang: action.sourceLang,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menerjemahkan teks.");
      }

      setRawText(json.data.translatedText);
      setIsTranslated(true);
    } catch (err: any) {
      console.error("Translate error:", err);
      setErrorMessage(err?.message || "Terjadi kendala saat menerjemahkan.");
    } finally {
      setIsTranslating(false);
    }
  };

  // 4. Save Project with Links, Account Info, and Linked Wallets (NO CHECKBOXES)
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama proyek wajib diisi.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Sesi login berakhir. Silakan login kembali.");
        setIsSaving(false);
        return;
      }

      // Prepare social links
      const social_links: Record<string, any> = {};
      if (websiteUrl.trim()) social_links.website = websiteUrl.trim();
      if (dappUrl.trim()) social_links.dapp_url = dappUrl.trim();
      if (twitterUrl.trim()) social_links.twitter = twitterUrl.trim();
      if (discordUrl.trim()) social_links.discord = discordUrl.trim();
      if (telegramPostUrl.trim()) social_links.telegram_post_url = telegramPostUrl.trim();
      if (channelSource?.channelName) social_links.channel = channelSource.channelName;

      // 1. Insert Project into Supabase
      const { data: projectData, error: projError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          folder_id: folderId || null,
          name: name.trim(),
          chain: chain.trim() || null,
          status: status,
          social_links,
          guide_content: rawText.trim() || null,
        })
        .select("id, name")
        .single();

      if (projError) throw projError;

      // 2. Insert Account / Email Used (if provided)
      if (projectData?.id && accountValue.trim()) {
        const { error: accError } = await supabase.from("accounts").insert({
          project_id: projectData.id,
          label: accountPlatform,
          username_email: accountValue.trim(),
        });
        if (accError) {
          console.error("Failed to insert account:", accError);
        }
      }

      // 3. Link Selected Wallets to Project (if any)
      if (projectData?.id && selectedWalletIds.length > 0) {
        const walletRows = selectedWalletIds.map((wid) => ({
          project_id: projectData.id,
          wallet_id: wid,
        }));
        const { error: walletError } = await supabase.from("project_wallets").insert(walletRows);
        if (walletError) {
          console.error("Failed to link wallets:", walletError);
        }
      }

      if (onProjectCreated && projectData) {
        onProjectCreated(projectData);
      }

      handleClose();
    } catch (err: any) {
      console.error("Save project error:", err);
      setErrorMessage(err?.message || "Gagal menyimpan proyek.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Proyek Airdrop Baru"
      description="Simpan garapan dari link Telegram atau ketik manual, lengkapi sosmed, akun email, dan wallet yang digunakan."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Method Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMethod("telegram_link")}
            className={`flex-1 py-2 px-3 rounded-lg text-caption font-semibold flex items-center justify-center gap-2 transition-all ${
              method === "telegram_link"
                ? "bg-link-teal/20 text-link-teal border border-link-teal/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Via Link Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod("manual_paste")}
            className={`flex-1 py-2 px-3 rounded-lg text-caption font-semibold flex items-center justify-center gap-2 transition-all ${
              method === "manual_paste"
                ? "bg-accent/20 text-accent border border-accent/40 shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ketik / Paste Manual</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSaveProject} className="space-y-4">
          {/* METHOD 1: VIA TELEGRAM LINK */}
          {method === "telegram_link" && (
            <div className="space-y-2">
              <label className="block text-caption font-medium text-text-secondary">
                Link Postingan Telegram
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
                    <Send className="w-4 h-4 text-link-teal" />
                  </div>
                  <input
                    type="url"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    placeholder="https://t.me/dutacryptoairdrop/1234 atau airdropfind/..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-link-teal/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchTelegram}
                  disabled={isFetchingTelegram || !telegramUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-link-teal text-black font-semibold text-caption hover:bg-link-teal/90 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTelegram ? "animate-spin" : ""}`} />
                  <span>{isFetchingTelegram ? "Mengambil..." : "Ambil Pesan"}</span>
                </button>
              </div>

              {channelSource && (
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] text-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-completed" />
                    <span>Sumber: <strong>{channelSource.channelName}</strong> ({channelSource.channelHandle})</span>
                  </div>
                  <a
                    href={telegramPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link-teal hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Buka Pesan Asli</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* POST CONTENT TEXTAREA (With Quick Translate Button) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-caption font-medium text-text-secondary">
                {method === "telegram_link" ? "Isi Postingan Telegram Asli" : "Paste Postingan Asli / Panduan"}
              </label>

              {(() => {
                const textToCheck = isTranslated && originalRawText ? originalRawText : rawText;
                const action = getTranslationAction(textToCheck, locale, isTranslated);
                if (!action.shouldShowTranslate || !rawText.trim()) return null;
                return (
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium transition-all ${
                      isTranslated
                        ? "bg-status-completed/20 text-status-completed border border-status-completed/40"
                        : "bg-white/[0.04] text-text-primary hover:bg-white/[0.08] border border-white/[0.1]"
                    }`}
                    title="Terjemahkan teks postingan"
                  >
                    <Languages className={`w-3.5 h-3.5 ${isTranslating ? "animate-spin text-accent" : ""}`} />
                    <span>
                      {isTranslating
                        ? (locale === "id" ? "Menerjemahkan..." : "Translating...")
                        : isTranslated
                        ? action.revertLabel
                        : action.buttonLabel}
                    </span>
                  </button>
                );
              })()}
            </div>

            <textarea
              rows={rawText ? 5 : 3}
              value={rawText}
              onChange={(e) => handleManualTextChange(e.target.value)}
              placeholder={
                method === "telegram_link"
                  ? "Teks postingan akan otomatis muncul di sini setelah Anda mengklik 'Ambil Pesan'..."
                  : "Paste teks postingan dari Telegram, Discord, atau Twitter di sini..."
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 leading-relaxed font-sans no-scrollbar resize-none"
            />
          </div>

          {/* SECTION 1: NAMA PROYEK, FOLDER, DAN JARINGAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-caption font-medium text-text-secondary mb-1">
                Nama Proyek <span className="text-status-overdue">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: MINARA, Monad"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50"
                required
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1">
                Folder Kategori
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121b] border border-white/[0.08] text-body-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer"
              >
                <option value="">Tanpa Folder (Semua)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1">
                Jaringan / Chain
              </label>
              <input
                type="text"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                placeholder="Contoh: EVM, Solana, Base"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {/* SECTION 2: SOCIAL MEDIA & TAUTAN GARAPAN */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>Link & Sosial Media Proyek</span>
              </span>
              <span className="text-[11px] text-text-tertiary">Otomatis terisi jika ada di teks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">Website / Portal</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">DApp / Web App Testnet</label>
                <input
                  type="url"
                  value={dappUrl}
                  onChange={(e) => setDappUrl(e.target.value)}
                  placeholder="https://app..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">Twitter / X</label>
                <input
                  type="text"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/... atau @handle"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">Discord</label>
                <input
                  type="text"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: AKUN / EMAIL YANG DIGUNAKAN DAFTAR */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-text-primary">
              <AtSign className="w-3.5 h-3.5 text-link-teal" />
              <span>Akun / Email yang Dipakai Garap (Non-sensitif)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">Jenis Akun</label>
                <select
                  value={accountPlatform}
                  onChange={(e) => setAccountPlatform(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d121b] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-link-teal cursor-pointer"
                >
                  <option value="Email">Email</option>
                  <option value="Twitter / X">Twitter / X</option>
                  <option value="Discord">Discord</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Google">Google</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-text-secondary mb-0.5">Username / Alamat Email</label>
                <input
                  type="text"
                  value={accountValue}
                  onChange={(e) => setAccountValue(e.target.value)}
                  placeholder="Misal: user@gmail.com atau @handle_airdrop"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary focus:outline-none focus:border-link-teal font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary">
              Catatan untuk mengingat identitas akun yang Anda daftarkan pada proyek ini agar tidak tertukar.
            </p>
          </div>

          {/* SECTION 4: WALLET YANG DIGUNAKAN */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span>Wallet yang Digunakan</span>
              </span>
              <span className="text-[11px] text-text-tertiary">
                {selectedWalletIds.length > 0 ? `${selectedWalletIds.length} dipilih` : "Opsional"}
              </span>
            </div>

            {userWallets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto no-scrollbar pt-1">
                {userWallets.map((w) => {
                  const isSelected = selectedWalletIds.includes(w.id);
                  const shortAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;

                  return (
                    <div
                      key={w.id}
                      onClick={() => handleToggleWallet(w.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-xs"
                          : "bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-caption font-semibold truncate leading-tight">
                          {w.label || "Wallet"}
                        </div>
                        <div className="text-[11px] font-mono text-text-tertiary">{shortAddr}</div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-black"
                            : "border-white/[0.2] bg-white/[0.02]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-text-tertiary">
                Belum ada wallet tersimpan di akun Anda. Anda dapat menambahkan wallet nanti di tab Wallets & Accounts atau melalui workstation proyek.
              </p>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
            <ButtonSecondary type="button" onClick={handleClose} disabled={isSaving}>
              Batal
            </ButtonSecondary>

            <ButtonPrimary
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-2 shadow-lg shadow-accent/20"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Proyek...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Proyek Airdrop</span>
                </>
              )}
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </Modal>
  );
}
