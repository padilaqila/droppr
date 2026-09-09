"use client";

import React, { useState, useEffect } from "react";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/select";
import {
  ShieldCheck,
  Wallet,
  Plus,
  Copy,
  Check,
  Trash2,
  FolderGit2,
  Link2,
  AtSign,
  Mail,
  Send,
  MessageSquare,
  GitBranch,
  Globe,
  UserCheck,
  Sparkles,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAccount, useConnect } from "wagmi";
import { useTranslation } from "@/lib/i18n/context";
import {
  createUserAccount,
  deleteUserAccount,
  updateUserAccount,
  type UserAccountItem,
} from "@/lib/supabase/user-accounts";
import type { Database } from "@/lib/supabase/database.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

interface WalletWithProjects extends WalletRow {
  projects?: { id: string; name: string }[];
}

interface WalletsClientViewProps {
  initialWallets: WalletWithProjects[];
  initialAccounts?: UserAccountItem[];
  currentUserEmail?: string | null;
}

interface InlineEditableProps {
  value: string;
  onSave: (nextVal: string) => Promise<void> | void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  inputClassName?: string;
  mono?: boolean;
  required?: boolean;
  title?: string;
  multiline?: boolean;
}

function InlineEditable({
  value,
  onSave,
  placeholder,
  emptyText,
  className = "",
  inputClassName = "",
  mono = false,
  required = false,
  title,
  multiline = false,
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaved, setIsSaved] = useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isSavingRef = React.useRef(false);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    const trimmed = tempValue.trim();
    setIsEditing(false);

    try {
      if (required && !trimmed) {
        setTempValue(value);
        return;
      }

      if (trimmed !== (value || "").trim()) {
        await onSave(trimmed);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 1800);
      }
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
      e.preventDefault();
      commitSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-flex items-center w-full min-w-[120px]">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={commitSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            className={`w-full bg-bg-base border border-accent text-text-primary px-2 py-1 rounded-md outline-none ring-1 ring-accent/40 shadow-inner text-body-sm resize-none ${
              mono ? "font-mono" : "font-sans"
            } ${inputClassName}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={commitSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full bg-bg-base border border-accent text-text-primary px-2 py-0.5 rounded-md outline-none ring-1 ring-accent/40 shadow-inner text-body-sm ${
              mono ? "font-mono" : "font-sans"
            } ${inputClassName}`}
          />
        )}
        <span className="absolute right-2 bottom-1 text-[10px] text-text-tertiary/70 pointer-events-none select-none font-mono">
          ↵
        </span>
      </div>
    );
  }

  const isEmpty = !value || value.trim() === "";
  const displayText = isEmpty ? emptyText || placeholder || "—" : value;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      title={title || "Klik untuk mengedit (otomatis tersimpan saat keluar)"}
      className={`group/inline relative inline-flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-white/[0.06] hover:ring-1 hover:ring-accent/30 transition-all select-none ${className}`}
    >
      <span
        className={`truncate ${mono ? "font-mono" : ""} ${
          isEmpty ? "text-text-tertiary italic font-normal" : ""
        }`}
      >
        {displayText}
      </span>
      {isSaved ? (
        <span className="inline-flex items-center gap-1 text-[10px] text-status-completed font-semibold px-1.5 py-0.5 rounded bg-status-completed/10 animate-fade-in shrink-0">
          <Check className="w-2.5 h-2.5" />
          <span>Tersimpan</span>
        </span>
      ) : (
        <Pencil className="w-3 h-3 text-text-tertiary opacity-0 group-hover/inline:opacity-70 transition-opacity shrink-0" />
      )}
    </div>
  );
}

export function WalletsClientView({
  initialWallets,
  initialAccounts = [],
  currentUserEmail = null,
}: WalletsClientViewProps) {
  const { isEn } = useTranslation();

  // Active Tab: "wallets" vs "accounts"
  const [activeTab, setActiveTab] = useState<"wallets" | "accounts">("wallets");

  // State: Wallets
  const [wallets, setWallets] = useState<WalletWithProjects[]>(initialWallets);

  // State: Accounts
  const [accounts, setAccounts] = useState<UserAccountItem[]>(initialAccounts);

  // Re-sync when server re-renders after router.refresh()
  useEffect(() => {
    setWallets(initialWallets);
  }, [initialWallets]);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  // Wagmi connection
  const { address: connectedAddress, isConnected, chain: connectedChain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const injectedConnector = connectors.find((c) => c.type === "injected");

  // Wallet Modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [chain, setChain] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Account Modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountPlatform, setAccountPlatform] = useState<string>("Twitter / X");
  const [customPlatform, setCustomPlatform] = useState("");
  const [accountHandle, setAccountHandle] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [accountNotes, setAccountNotes] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Import connected wallet
  const handleImportConnectedWallet = () => {
    if (!connectedAddress) return;
    setAddress(connectedAddress);
    setLabel(`Wallet Terkoneksi (${connectedChain?.name || "EVM"})`);
    setChain(connectedChain?.name || "EVM");
    setIsWalletModalOpen(true);
  };

  // Create Wallet
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setWalletError("Alamat wallet wajib diisi.");
      return;
    }

    setWalletLoading(true);
    setWalletError(null);

    try {
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWalletError("Sesi login berakhir.");
        setWalletLoading(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          address: address.trim(),
          label: label.trim() || null,
          chain: chain.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setWallets([data, ...wallets]);
      setAddress("");
      setLabel("");
      setChain("");
      setIsWalletModalOpen(false);
    } catch (err: any) {
      console.error("Failed to insert wallet:", err);
      setWalletError(err?.message || (isEn ? "Failed to save wallet." : "Gagal menyimpan wallet."));
    } finally {
      setWalletLoading(false);
    }
  };

  // Delete Wallet
  const handleDeleteWallet = async (id: string) => {
    if (!confirm(isEn ? "Delete this wallet from your list?" : "Hapus wallet ini dari daftar?")) return;
    try {
      const supabase = createClient() as any;
      await supabase.from("wallets").delete().eq("id", id);
      setWallets(wallets.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Delete wallet error:", err);
    }
  };

  // Update Wallet Inline (Auto-saved)
  const handleUpdateWallet = async (
    id: string,
    updates: Partial<{ label: string | null; address: string; chain: string | null }>
  ) => {
    // Optimistic UI update
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );

    try {
      const supabase = createClient() as any;
      const { error } = await supabase
        .from("wallets")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Failed to update wallet in DB:", error);
      }
    } catch (err) {
      console.error("Update wallet inline error:", err);
    }
  };

  // Create Social Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountHandle.trim()) {
      setAccountError(isEn ? "Handle / Username / Email is required." : "Handle / Username / Email wajib diisi.");
      return;
    }

    setAccountLoading(true);
    setAccountError(null);

    try {
      const finalPlatform =
        accountPlatform === "Custom"
          ? customPlatform.trim() || (isEn ? "Custom" : "Kustom")
          : accountPlatform;

      const created = await createUserAccount({
        platform: finalPlatform,
        handle: accountHandle.trim(),
        label: accountLabel.trim() || null,
        notes: accountNotes.trim() || null,
      });

      if (created) {
        setAccounts([created, ...accounts.filter((a) => a.id !== created.id)]);
        setAccountHandle("");
        setAccountLabel("");
        setAccountNotes("");
        setCustomPlatform("");
        setIsAccountModalOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to save account:", err);
      setAccountError(err?.message || (isEn ? "Failed to save account." : "Gagal menyimpan akun."));
    } finally {
      setAccountLoading(false);
    }
  };

  // Delete Social Account
  const handleDeleteAccount = async (id: string) => {
    if (!confirm(isEn ? "Delete this account from your list?" : "Hapus akun ini dari daftar?")) return;
    try {
      const ok = await deleteUserAccount(id);
      if (ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Delete account error:", err);
    }
  };

  // Update Social Account Inline (Auto-saved)
  const handleUpdateAccount = async (
    id: string,
    updates: Partial<Omit<UserAccountItem, "id" | "created_at" | "user_id">>
  ) => {
    // Optimistic UI update
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );

    try {
      const ok = await updateUserAccount(id, updates);
      if (!ok) {
        console.warn("Failed to update account inline");
      }
    } catch (err) {
      console.error("Update account inline error:", err);
    }
  };

  // Quick Add Login Email if not already in list
  const handleQuickAddEmail = async () => {
    if (!currentUserEmail) return;
    setAccountLoading(true);
    try {
      const created = await createUserAccount({
        platform: "Email",
        handle: currentUserEmail,
        label: isEn ? "Primary Login Email" : "Email Login Utama",
        notes: isEn ? "Default email used for login" : "Email utama yang dipakai login",
      });
      if (created) {
        setAccounts([created, ...accounts]);
      }
    } catch (err) {
      console.error("Quick add email error:", err);
    } finally {
      setAccountLoading(false);
    }
  };

  // Helper: platform icon
  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("twitter") || p.includes("x")) return <AtSign className="w-4 h-4 text-[#1DA1F2]" />;
    if (p.includes("discord")) return <MessageSquare className="w-4 h-4 text-[#5865F2]" />;
    if (p.includes("telegram")) return <Send className="w-4 h-4 text-[#229ED9]" />;
    if (p.includes("email") || p.includes("mail") || p.includes("google")) return <Mail className="w-4 h-4 text-accent" />;
    if (p.includes("github")) return <GitBranch className="w-4 h-4 text-text-primary" />;
    return <Globe className="w-4 h-4 text-link-teal" />;
  };

  const isEmailAlreadySaved = accounts.some(
    (a) => a.handle.toLowerCase() === (currentUserEmail || "").toLowerCase()
  );

  return (
    <div className="w-full space-y-6 min-w-0 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            {isEn ? "Wallets & Accounts" : "Wallets & Akun"}
          </h1>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {isEn
              ? "Manage public wallet addresses and social media identities for multi-account airdrop tracking."
              : "Kelola alamat wallet publik dan akun sosial media untuk keperluan multi-akun serta tracking airdrop agar tidak tertukar."}
          </p>
        </div>

        {/* Action Buttons depending on Tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "wallets" ? (
            <>
              {isConnected && connectedAddress ? (
                <ButtonSecondary
                  onClick={handleImportConnectedWallet}
                  className="inline-flex items-center gap-2 text-caption sm:text-body-sm"
                >
                  <Link2 className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Save Connected Wallet" : "Simpan Wallet Terkoneksi"}</span>
                </ButtonSecondary>
              ) : (
                <ButtonSecondary
                  onClick={() => injectedConnector && connect({ connector: injectedConnector })}
                  disabled={isConnecting || !injectedConnector}
                  className="inline-flex items-center gap-2 text-caption sm:text-body-sm"
                >
                  <Wallet className="w-4 h-4 text-accent" />
                  <span>
                    {isConnecting
                      ? isEn
                        ? "Connecting..."
                        : "Menghubungkan..."
                      : isEn
                      ? "Connect Browser Wallet"
                      : "Hubungkan Browser Wallet"}
                  </span>
                </ButtonSecondary>
              )}

              <ButtonPrimary
                onClick={() => {
                  setAddress("");
                  setLabel("");
                  setChain("");
                  setIsWalletModalOpen(true);
                }}
                className="inline-flex items-center gap-2 text-caption sm:text-body-sm"
              >
                <Plus className="w-4 h-4 text-on-accent" />
                <span>{isEn ? "Add Wallet Manually" : "Tambah Wallet Manual"}</span>
              </ButtonPrimary>
            </>
          ) : (
            <>
              {currentUserEmail && !isEmailAlreadySaved && (
                <ButtonSecondary
                  onClick={handleQuickAddEmail}
                  disabled={accountLoading}
                  className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
                >
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Add Login Email" : "Catat Email Login Ini"}</span>
                </ButtonSecondary>
              )}

              <ButtonPrimary
                onClick={() => {
                  setAccountHandle("");
                  setAccountLabel("");
                  setAccountNotes("");
                  setAccountPlatform("Twitter / X");
                  setIsAccountModalOpen(true);
                }}
                className="inline-flex items-center gap-2 text-caption sm:text-body-sm"
              >
                <Plus className="w-4 h-4 text-on-accent" />
                <span>{isEn ? "Add Social Account" : "Tambah Akun Sosial"}</span>
              </ButtonPrimary>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border-hairline pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("wallets")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption sm:text-body-sm font-semibold transition-all ${
            activeTab === "wallets"
              ? "bg-accent text-on-accent shadow-md shadow-accent/20"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{isEn ? "Wallets (Crypto)" : "Dompet Kripto (Wallets)"}</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
              activeTab === "wallets"
                ? "bg-on-accent/15 text-on-accent"
                : "bg-bg-elevated text-text-tertiary border border-border-hairline"
            }`}
          >
            {wallets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption sm:text-body-sm font-semibold transition-all ${
            activeTab === "accounts"
              ? "bg-accent text-on-accent shadow-md shadow-accent/20"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
          }`}
        >
          <AtSign className="w-4 h-4" />
          <span>{isEn ? "Social & Accounts" : "Akun & Sosial Media"}</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
              activeTab === "accounts"
                ? "bg-on-accent/15 text-on-accent"
                : "bg-bg-elevated text-text-tertiary border border-border-hairline"
            }`}
          >
            {accounts.length}
          </span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border-hairline flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-status-completed shrink-0 mt-0.5" />
        <div className="text-body-sm">
          <span className="font-semibold text-text-primary">
            {isEn ? "Guaranteed Security:" : "Keamanan Terjamin:"}
          </span>{" "}
          <span className="text-text-secondary">
            {activeTab === "wallets"
              ? isEn
                ? "Droppr is strictly read-only and never asks for or stores private keys or seed phrases."
                : "Droppr bersifat read-only dan tidak pernah meminta atau menyimpan private key maupun seed phrase."
              : isEn
              ? "Only record public usernames, handles, and emails. NEVER save passwords or sensitive credentials."
              : "Hanya catat username, handle publik, dan email yang dipakai garap. JANGAN PERNAH menyimpan password atau kredensial rahasia."}
          </span>
        </div>
      </div>

      {/* Quick Inline Editing Tip */}
      <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 flex items-center gap-2.5 text-caption text-text-secondary">
        <Pencil className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>
          {isEn ? (
            <>
              <strong className="text-text-primary">Inline Editing:</strong> Click directly on any account name, handle, address, or note to edit. Simply type and click outside — changes auto-save immediately without popups.
            </>
          ) : (
            <>
              <strong className="text-text-primary">Edit Cepat:</strong> Klik langsung pada nama akun, handle, chain, alamat, atau catatan untuk mengedit. Cukup ketik dan ketuk di area luar — otomatis tersimpan tanpa popup.
            </>
          )}
        </span>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WALLETS LIST                                      */}
      {/* ======================================================== */}
      {activeTab === "wallets" && (
        <>
          {wallets.length === 0 ? (
            <CardBase className="text-center py-12 space-y-3">
              <Wallet className="w-8 h-8 text-text-tertiary mx-auto mb-1" />
              <h3 className="text-heading-3 font-semibold text-text-primary">
                {isEn ? "No wallets saved yet" : "Belum ada wallet tersimpan"}
              </h3>
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
                {isEn
                  ? "Save the wallet addresses you use for airdrop hunting to easily copy and assign to projects and waitlists."
                  : "Simpan alamat wallet yang kamu pakai untuk hunting airdrop agar mudah disalin dan dipilih cepat saat daftar waitlist & project."}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                {isConnected && connectedAddress && (
                  <ButtonSecondary
                    onClick={handleImportConnectedWallet}
                    className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
                  >
                    <Link2 className="w-4 h-4 text-accent" />
                    <span>
                      {isEn
                        ? `Save Connected Wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)})`
                        : `Simpan Wallet Terkoneksi (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)})`}
                    </span>
                  </ButtonSecondary>
                )}
                <ButtonPrimary
                  onClick={() => setIsWalletModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
                >
                  <Plus className="w-4 h-4 text-on-accent" />
                  <span>{isEn ? "Add First Wallet" : "Tambah Wallet Pertama"}</span>
                </ButtonPrimary>
              </div>
            </CardBase>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {wallets.map((w) => {
                const isCopied = copiedId === w.id;
                const projectCount = w.projects ? w.projects.length : 0;

                return (
                  <CardBase
                    key={w.id}
                    className="space-y-3 hover:border-border-hairline-strong transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <InlineEditable
                            value={w.label || ""}
                            emptyText={isEn ? "Unlabeled Wallet (click to edit)" : "Wallet Tanpa Label (klik untuk edit)"}
                            placeholder={isEn ? "Wallet name..." : "Nama / label wallet..."}
                            title={isEn ? "Click to edit wallet name (auto-saves)" : "Klik untuk edit nama wallet (otomatis tersimpan)"}
                            onSave={(val) => handleUpdateWallet(w.id, { label: val || null })}
                            className="text-body-md font-semibold text-text-primary max-w-full"
                            inputClassName="text-body-md font-semibold"
                          />
                          <InlineEditable
                            value={w.chain || ""}
                            emptyText={isEn ? "+ Chain" : "+ Chain"}
                            placeholder="EVM / Solana..."
                            title={isEn ? "Click to edit chain" : "Klik untuk edit chain"}
                            onSave={(val) => handleUpdateWallet(w.id, { chain: val || null })}
                            className="text-[10px] px-2 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline font-mono text-text-tertiary uppercase"
                            inputClassName="text-[10px] font-mono uppercase w-28"
                          />
                        </div>
                        <div className="w-full">
                          <InlineEditable
                            value={w.address}
                            required
                            mono
                            title={isEn ? "Click to edit address (auto-saves)" : "Klik untuk mengedit alamat wallet (otomatis tersimpan)"}
                            placeholder={isEn ? "Wallet address..." : "Alamat wallet..."}
                            onSave={(val) => handleUpdateWallet(w.id, { address: val })}
                            className="text-caption font-mono text-text-secondary break-all w-full"
                            inputClassName="text-caption font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(w.id, w.address)}
                          className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-text-primary transition-colors"
                          title={isEn ? "Copy Address" : "Salin Address"}
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-status-completed" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWallet(w.id)}
                          className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-status-overdue transition-colors"
                          title={isEn ? "Delete Wallet" : "Hapus Wallet"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned Projects Badge */}
                    <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-caption text-text-tertiary">
                      <div className="flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>
                          {projectCount > 0
                            ? isEn
                              ? `Used in ${projectCount} projects`
                              : `Digunakan di ${projectCount} project`
                            : isEn
                            ? "Not assigned to any project"
                            : "Belum dipasangkan ke project"}
                        </span>
                      </div>
                    </div>
                  </CardBase>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SOCIAL ACCOUNTS LIST                              */}
      {/* ======================================================== */}
      {activeTab === "accounts" && (
        <>
          {accounts.length === 0 ? (
            <CardBase className="text-center py-12 space-y-3">
              <AtSign className="w-8 h-8 text-text-tertiary mx-auto mb-1" />
              <h3 className="text-heading-3 font-semibold text-text-primary">
                {isEn ? "No social accounts saved yet" : "Belum ada akun sosial tersimpan"}
              </h3>
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
                {isEn
                  ? "Save your Twitter/X, Discord, Telegram, and Email handles to pick them in 1 click when registering waitlists or projects."
                  : "Simpan username Twitter/X, Discord, Telegram, dan Email yang kamu pakai agar bisa dipilih cepat dengan 1 klik saat daftar waitlist & project."}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                {currentUserEmail && !isEmailAlreadySaved && (
                  <ButtonSecondary
                    onClick={handleQuickAddEmail}
                    disabled={accountLoading}
                    className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
                  >
                    <Mail className="w-4 h-4 text-accent" />
                    <span>
                      {isEn
                        ? `Save Login Email (${currentUserEmail})`
                        : `Simpan Email Login (${currentUserEmail})`}
                    </span>
                  </ButtonSecondary>
                )}
                <ButtonPrimary
                  onClick={() => setIsAccountModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-caption sm:text-body-sm"
                >
                  <Plus className="w-4 h-4 text-on-accent" />
                  <span>{isEn ? "Add First Account" : "Tambah Akun Pertama"}</span>
                </ButtonPrimary>
              </div>
            </CardBase>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {accounts.map((acc) => {
                const isCopied = copiedId === acc.id;

                return (
                  <CardBase
                    key={acc.id}
                    className="space-y-3 hover:border-border-hairline-strong transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="p-1.5 rounded-lg bg-bg-elevated-2 border border-border-hairline shrink-0">
                            {getPlatformIcon(acc.platform)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <InlineEditable
                              value={acc.label || ""}
                              emptyText={acc.platform}
                              placeholder={isEn ? "Account name/label..." : "Nama / label akun..."}
                              title={isEn ? "Click to edit account name (auto-saves)" : "Klik untuk edit nama akun (otomatis tersimpan)"}
                              onSave={(val) => handleUpdateAccount(acc.id, { label: val || null })}
                              className="text-body-md font-semibold text-text-primary max-w-full"
                              inputClassName="text-body-md font-semibold"
                            />
                            <div className="text-[10px] font-mono text-text-tertiary">
                              {acc.platform}
                            </div>
                          </div>
                        </div>

                        {/* Handle / Username */}
                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.05]">
                          <InlineEditable
                            value={acc.handle}
                            required
                            mono
                            title={isEn ? "Click to edit handle (auto-saves)" : "Klik untuk edit handle (otomatis tersimpan)"}
                            placeholder={isEn ? "@handle or email..." : "@handle atau email..."}
                            onSave={(val) => handleUpdateAccount(acc.id, { handle: val })}
                            className="text-caption font-mono font-medium text-accent break-all w-full"
                            inputClassName="text-caption font-mono text-accent"
                          />
                        </div>

                        {/* Notes */}
                        <div className="pt-0.5">
                          <InlineEditable
                            value={acc.notes || ""}
                            emptyText={isEn ? "+ Add notes..." : "+ Tambah catatan..."}
                            placeholder={isEn ? "Notes (e.g. 2FA active, email bound)..." : "Catatan (misal: 2FA aktif, no hp...)..."}
                            title={isEn ? "Click to edit notes (auto-saves)" : "Klik untuk edit catatan (otomatis tersimpan)"}
                            onSave={(val) => handleUpdateAccount(acc.id, { notes: val || null })}
                            className="text-[11px] text-text-tertiary italic w-full"
                            inputClassName="text-[11px] text-text-secondary"
                            multiline
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.id, acc.handle)}
                          className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-text-primary transition-colors"
                          title={isEn ? "Copy Handle" : "Salin Handle"}
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-status-completed" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-status-overdue transition-colors"
                          title={isEn ? "Delete Account" : "Hapus Akun"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-[11px] text-text-tertiary">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-status-completed" />
                        <span>{isEn ? "Ready for 1-click select" : "Siap dipilih 1-klik"}</span>
                      </span>
                    </div>
                  </CardBase>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH WALLET MANUAL                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title={isEn ? "Add Wallet Address" : "Tambah Alamat Wallet"}
        description={
          isEn
            ? "Save public wallet address to link to airdrop tasks and waitlists."
            : "Simpan address publik wallet Anda untuk dipasangkan ke tugas airdrop & waitlist."
        }
        maxWidth="md"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          {walletError && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {walletError}
            </div>
          )}

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Wallet Label / Name" : "Label / Nama Wallet"} <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                isEn
                  ? "e.g. Main EVM, Sybil 01, Backpack Solana"
                  : "Contoh: Akun Utama EVM, Wallet Tuyul 01, Backpack Solana"
              }
              required
              disabled={walletLoading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Public Address" : "Alamat Publik (Address)"} <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isEn ? "0x... or Solana/Sui/Cosmos address" : "0x... atau address Solana/Sui/Cosmos"}
              className="font-mono text-data-mono-sm"
              required
              disabled={walletLoading}
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              {isEn
                ? "Droppr is strictly read-only. Never enter private keys or seed phrases."
                : "Droppr strictly read-only. Jangan pernah memasukkan private key/seed phrase."}
            </p>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Chain / Network (Optional)" : "Chain / Jaringan (Opsional)"}
            </label>
            <Input
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              placeholder={isEn ? "e.g. EVM, Solana, Sui, Berachain" : "Contoh: EVM, Solana, Sui, Berachain"}
              disabled={walletLoading}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary
              type="button"
              onClick={() => setIsWalletModalOpen(false)}
              disabled={walletLoading}
            >
              {isEn ? "Cancel" : "Batal"}
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={walletLoading}>
              {walletLoading ? (isEn ? "Saving..." : "Menyimpan...") : isEn ? "Save Wallet" : "Simpan Wallet"}
            </ButtonPrimary>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: TAMBAH AKUN SOSIAL                              */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={isEn ? "Add Social / Identity Account" : "Tambah Akun Sosial / Identitas"}
        description={
          isEn
            ? "Save your social handles to quickly select when registering for waitlists."
            : "Simpan handle media sosial untuk dipilih cepat saat mendaftar waitlist atau airdrop."
        }
        maxWidth="md"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          {accountError && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {accountError}
            </div>
          )}

          <div>
            <CustomSelect
              label={isEn ? "Platform / Category" : "Platform / Kategori"}
              required
              value={accountPlatform}
              onChange={(val) => setAccountPlatform(val)}
              disabled={accountLoading}
              options={[
                { value: "Twitter / X", label: "Twitter / X", icon: getPlatformIcon("Twitter / X") },
                { value: "Discord", label: "Discord", icon: getPlatformIcon("Discord") },
                { value: "Telegram", label: "Telegram", icon: getPlatformIcon("Telegram") },
                { value: "Email", label: "Email", icon: getPlatformIcon("Email") },
                { value: "GitHub", label: "GitHub", icon: getPlatformIcon("GitHub") },
                { value: "Google", label: "Google", icon: getPlatformIcon("Google") },
                { value: "Custom", label: isEn ? "Other / Custom" : "Lainnya / Kustom", icon: getPlatformIcon("Custom") },
              ]}
            />
          </div>

          {accountPlatform === "Custom" && (
            <div>
              <label className="block text-body-sm font-medium text-text-secondary mb-1">
                {isEn ? "Custom Platform Name" : "Nama Platform Kustom"} <span className="text-status-overdue">*</span>
              </label>
              <Input
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                placeholder={isEn ? "e.g. Medium, Galxe, Zealy, DeBank" : "Contoh: Medium, Galxe, Zealy, DeBank"}
                required
                disabled={accountLoading}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Username / Handle / Email" : "Username / Handle / Email"} <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
              placeholder={
                accountPlatform === "Twitter / X"
                  ? "@0xPadiel"
                  : accountPlatform === "Email" || accountPlatform === "Google"
                  ? "name@example.com"
                  : accountPlatform === "Discord"
                  ? "username / user#1234"
                  : accountPlatform === "Telegram"
                  ? "@telegram_user"
                  : "@handle / username"
              }
              className="font-mono text-body-sm"
              required
              disabled={accountLoading}
              autoFocus
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              {isEn
                ? "Never enter passwords or private keys. Public identity only."
                : "Hanya masukkan identitas publik. Jangan pernah memasukkan kata sandi."}
            </p>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Label / Name (Optional)" : "Label / Nama Akun (Opsional)"}
            </label>
            <Input
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder={isEn ? "e.g. Primary Account, Tuyul 01, Backup" : "Contoh: Akun Utama, Tuyul 01, Cadangan"}
              disabled={accountLoading}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              {isEn ? "Notes (Optional)" : "Catatan Tambahan (Opsional)"}
            </label>
            <Input
              value={accountNotes}
              onChange={(e) => setAccountNotes(e.target.value)}
              placeholder={isEn ? "e.g. Bound to phone +62..., 2FA active" : "Misal: Terhubung ke no hp +62..., aktif sejak 2023"}
              disabled={accountLoading}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary
              type="button"
              onClick={() => setIsAccountModalOpen(false)}
              disabled={accountLoading}
            >
              {isEn ? "Cancel" : "Batal"}
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={accountLoading}>
              {accountLoading ? (isEn ? "Saving..." : "Menyimpan...") : isEn ? "Save Account" : "Simpan Akun"}
            </ButtonPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
