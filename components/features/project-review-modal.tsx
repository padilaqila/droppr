"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/select";
import {
  Globe,
  Send,
  MessageSquare,
  Droplets,
  Layers,
  BookOpen,
  Share2,
  RotateCcw,
  Sparkles,
  Zap,
  AtSign,
  Check,
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  Gift,
  Copy,
  ChevronDown,
  ChevronUp,
  Repeat,
  PauseCircle,
  Play,
  Hourglass,
  Folder,
  CheckSquare,
  Wallet,
  Plus,
  Search,
  X,
  Mail,
  UserCheck,
} from "lucide-react";
import { useAccount } from "wagmi";
import { parseAirdropProjectData } from "@/lib/supabase/airdrop-parser";
import { sanitizeSurrogates, sanitizeJsonObject } from "@/lib/supabase/thread-updates";
import {
  calculateNextTrigger,
  encodeFrequency,
  DAYS_OF_WEEK,
  type ReminderScheduleType,
} from "@/lib/supabase/reminders-helper";
import { createClient } from "@/lib/supabase/client";
import {
  fetchQuickPickerIdentities,
  createWalletItem,
  createUserAccount,
  type UserAccountItem,
} from "@/lib/supabase/user-accounts";
import type { Database } from "@/lib/supabase/database.types";
import type { AirdropFeedItem } from "@/lib/supabase/airdrop-feeds";
import type { WaitlistItem } from "@/lib/supabase/waitlists";
import { useTranslation } from "@/lib/i18n/context";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type RoutineType = "daily" | "weekly" | "one_time";
type QuickReminderOption = "daily" | "once" | "weekly" | "none";

interface FolderOption {
  id: string;
  name: string;
}

interface ProjectReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: "feed" | "waitlist";
  feedItem?: AirdropFeedItem | null;
  waitlistItem?: WaitlistItem | null;
  onSuccess?: (projectId: string) => void;
}

export function ProjectReviewModal({
  isOpen,
  onClose,
  source,
  feedItem,
  waitlistItem,
  onSuccess,
}: ProjectReviewModalProps) {
  const router = useRouter();
  const { isEn } = useTranslation();

  // Wagmi connection
  const { address: connectedAddress } = useAccount();

  // Loading & Error States
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");
  const [taskType, setTaskType] = useState<RoutineType>("daily");
  const [claimUrl, setClaimUrl] = useState("");
  const [folderId, setFolderId] = useState<string>("");
  const [folders, setFolders] = useState<FolderOption[]>([]);

  // Links
  const [website, setWebsite] = useState("");
  const [dappUrl, setDappUrl] = useState("");
  const [faucetUrl, setFaucetUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [telegramPostUrl, setTelegramPostUrl] = useState("");
  const [discord, setDiscord] = useState("");
  const [refLink, setRefLink] = useState("");

  // Wallets State
  const [savedWallets, setSavedWallets] = useState<
    Array<{ id: string; address: string; label: string | null; chain: string | null }>
  >([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [walletSearch, setWalletSearch] = useState("");

  // Quick Add Wallet Form
  const [isQuickAddWalletOpen, setIsQuickAddWalletOpen] = useState(false);
  const [quickWalletAddress, setQuickWalletAddress] = useState("");
  const [quickWalletLabel, setQuickWalletLabel] = useState("");
  const [quickWalletChain, setQuickWalletChain] = useState("EVM");
  const [isSavingQuickWallet, setIsSavingQuickWallet] = useState(false);
  const [quickWalletError, setQuickWalletError] = useState<string | null>(null);

  // Account & Identity State
  const [savedAccounts, setSavedAccounts] = useState<UserAccountItem[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [accountLabel, setAccountLabel] = useState("Email");
  const [customPlatform, setCustomPlatform] = useState("");
  const [accountValue, setAccountValue] = useState("");
  const [accountPickerCategory, setAccountPickerCategory] = useState<"all" | "socials" | "email">("all");
  const [accountPickerSearch, setAccountPickerSearch] = useState("");

  // Quick Add Account Form
  const [isQuickAddAccountOpen, setIsQuickAddAccountOpen] = useState(false);
  const [quickAccountPlatform, setQuickAccountPlatform] = useState("Twitter / X");
  const [quickAccountHandle, setQuickAccountHandle] = useState("");
  const [quickAccountLabel, setQuickAccountLabel] = useState("");
  const [isSavingQuickAccount, setIsSavingQuickAccount] = useState(false);
  const [quickAccountError, setQuickAccountError] = useState<string | null>(null);

  // Quick Reminder Settings
  const [reminderOption, setReminderOption] = useState<QuickReminderOption>("daily");
  const [reminderTime, setReminderTime] = useState("07:00");
  const [reminderDate, setReminderDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [reminderDays, setReminderDays] = useState<string[]>(["mon"]);

  // Guide / Notes & Collapsible state
  const [guideContent, setGuideContent] = useState("");
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  const [isCopiedGuide, setIsCopiedGuide] = useState(false);

  // Load identities (wallets, accounts, user email) and folders
  const loadIdentities = async () => {
    try {
      const data = await fetchQuickPickerIdentities();
      setSavedWallets(data.wallets);
      setSavedAccounts(data.accounts);
      setCurrentUserEmail(data.userEmail);
      return data;
    } catch (err) {
      console.error("Failed to load identities:", err);
      return { wallets: [], accounts: [], userEmail: null };
    }
  };

  // Load folders and identities on open
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient() as any;
    supabase
      .from("folders")
      .select("id, name")
      .order("name")
      .then(({ data }: any) => {
        if (data && Array.isArray(data)) {
          setFolders(data);
        }
      });

    loadIdentities().then((data) => {
      // Auto-match wallet if accountNote is present from waitlist
      const accountNote = waitlistItem?.registered_account || null;
      if (accountNote && data?.wallets) {
        const matchingWallet = data.wallets.find(
          (w) => w.address.toLowerCase() === accountNote.toLowerCase()
        );
        if (matchingWallet) {
          setSelectedWalletIds((prev) =>
            prev.includes(matchingWallet.id) ? prev : [...prev, matchingWallet.id]
          );
        }
      }
    });
  }, [isOpen, waitlistItem]);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);

    const rawTitle = feedItem ? feedItem.title : (waitlistItem?.project_name || waitlistItem?.title || "");
    const rawText = feedItem ? feedItem.raw_text : (waitlistItem?.raw_text || "");
    const sourceUrl = feedItem ? feedItem.source_url : (waitlistItem?.source_url || "");
    const ref = waitlistItem?.ref_link || null;
    const accountNote = waitlistItem?.registered_account || null;
    const cost = feedItem?.cost || null;
    const existingTasks = feedItem?.tasks || waitlistItem?.tasks || [];

    // Parse deterministic links and data
    const parsed = parseAirdropProjectData(rawTitle, rawText, {
      sourceUrl,
      refLink: ref,
      accountNote,
      cost,
      existingTasks,
    });

    setName(parsed.name || "Airdrop Project");
    setChain(parsed.chain || "Multi-chain");

    setIsGuideExpanded(false);
    setIsCopiedGuide(false);

    // Determine initial status & routine type
    if (source === "waitlist") {
      setStatus(waitlistItem?.status === "joined" ? "waiting" : "not_started");
      setTaskType("one_time");
    } else {
      const isActionable =
        feedItem?.category === "testnet" ||
        feedItem?.category === "retro" ||
        feedItem?.category === "airdrop";
      setStatus(isActionable ? "in_progress" : "not_started");
      setTaskType(feedItem?.category === "testnet" ? "daily" : "one_time");
    }

    // Links
    const sl = parsed.social_links || {};
    setWebsite(sl.website || "");
    setDappUrl(sl.dapp_url || "");
    setFaucetUrl(sl.faucet_url || "");
    setDocsUrl(sl.docs_url || "");
    setTwitter(sl.twitter || "");
    setTelegram(sl.telegram || "");
    setTelegramPostUrl(sl.telegram_post_url || sourceUrl || "");
    setDiscord(sl.discord || "");
    setRefLink(sl.ref_link || ref || "");
    setClaimUrl(sl.claim_url || "");

    // Account note
    if (accountNote) {
      if (accountNote.includes("@") && accountNote.includes(".")) {
        setAccountLabel("Email");
      } else if (accountNote.startsWith("0x") || accountNote.length > 30) {
        setAccountLabel("Wallet Address");
      } else if (accountNote.startsWith("@")) {
        setAccountLabel("Twitter / X");
      } else {
        setAccountLabel("Akun Pendaftar");
      }
      setAccountValue(accountNote);
    } else {
      setAccountLabel("Email");
      setAccountValue("");
    }

    // Guide: Pure original post as requested (no redundant reformatted AI summary)
    setGuideContent(rawText || "");
  }, [isOpen, source, feedItem, waitlistItem]);

  const toggleReminderDay = (dayId: string) => {
    setReminderDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleCopyGuide = () => {
    if (!guideContent) return;
    navigator.clipboard.writeText(guideContent);
    setIsCopiedGuide(true);
    setTimeout(() => setIsCopiedGuide(false), 2000);
  };

  // Toggle Wallet Selection
  const handleToggleWallet = (walletId: string) => {
    setSelectedWalletIds((prev) =>
      prev.includes(walletId) ? prev.filter((id) => id !== walletId) : [...prev, walletId]
    );
  };

  // Quick Add Wallet Handler
  const handleSaveQuickWallet = async () => {
    const cleanAddr = quickWalletAddress.trim();
    if (!cleanAddr) {
      setQuickWalletError(isEn ? "Wallet address is required." : "Alamat wallet wajib diisi.");
      return;
    }
    setIsSavingQuickWallet(true);
    setQuickWalletError(null);
    try {
      const saved = await createWalletItem({
        address: cleanAddr,
        label: quickWalletLabel.trim() || null,
        chain: quickWalletChain.trim() || "EVM",
      });
      if (saved) {
        setSavedWallets((prev) => {
          const exists = prev.some((w) => w.id === saved.id);
          return exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
        });
        setSelectedWalletIds((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
        setQuickWalletAddress("");
        setQuickWalletLabel("");
        setQuickWalletChain("EVM");
        setIsQuickAddWalletOpen(false);
      }
    } catch (err: any) {
      setQuickWalletError(err?.message || (isEn ? "Failed to save wallet." : "Gagal menyimpan wallet."));
    } finally {
      setIsSavingQuickWallet(false);
    }
  };

  // Quick Add Account Handler
  const handleSaveQuickAccount = async () => {
    const cleanHandle = quickAccountHandle.trim();
    if (!cleanHandle) {
      setQuickAccountError(isEn ? "Username or handle is required." : "Username atau handle wajib diisi.");
      return;
    }
    setIsSavingQuickAccount(true);
    setQuickAccountError(null);
    try {
      const saved = await createUserAccount({
        platform: quickAccountPlatform,
        handle: cleanHandle,
        label: quickAccountLabel.trim() || null,
      });
      if (saved) {
        setSavedAccounts((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
        setAccountLabel(saved.platform);
        setAccountValue(saved.handle);
        setQuickAccountHandle("");
        setQuickAccountLabel("");
        setIsQuickAddAccountOpen(false);
      }
    } catch (err: any) {
      setQuickAccountError(err?.message || (isEn ? "Failed to save account." : "Gagal menyimpan akun."));
    } finally {
      setIsSavingQuickAccount(false);
    }
  };

  // Quick Prefill from Identity Pill
  const handlePrefillAccount = (handle: string, platform?: string) => {
    setAccountValue(handle);
    if (platform) {
      setAccountLabel(platform);
    } else if (handle.includes("@") && handle.includes(".")) {
      setAccountLabel("Email");
    } else if (handle.startsWith("0x") || handle.length > 30) {
      setAccountLabel("Wallet Address");
    } else if (handle.startsWith("@")) {
      setAccountLabel("Twitter / X");
    }
  };

  // Prefill Quick Add Account from Typed Handle
  const handlePrefillQuickAddAccount = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setIsQuickAddAccountOpen(true);
    setQuickAccountHandle(trimmed);
    if (trimmed.includes("@") && trimmed.includes(".")) {
      setQuickAccountPlatform("Email");
    } else if (trimmed.startsWith("@")) {
      setQuickAccountPlatform("Twitter / X");
    } else {
      setQuickAccountPlatform(accountLabel || "Twitter / X");
    }
  };

  // Account Category Counts
  const accountCategoryCounts = useMemo(() => {
    const totalSocials = savedAccounts.filter(
      (a) =>
        !a.platform.toLowerCase().includes("email") &&
        !a.platform.toLowerCase().includes("mail")
    ).length;
    const totalEmails =
      (currentUserEmail && !savedAccounts.some((a) => a.handle.toLowerCase() === currentUserEmail.toLowerCase()) ? 1 : 0) +
      savedAccounts.filter(
        (a) =>
          a.platform.toLowerCase().includes("email") ||
          a.platform.toLowerCase().includes("mail")
      ).length;
    return {
      all: totalSocials + totalEmails,
      socials: totalSocials,
      email: totalEmails,
    };
  }, [savedAccounts, currentUserEmail]);

  // Filtered Accounts for Quick Picker
  const filteredAccounts = useMemo(() => {
    const q = accountPickerSearch.trim().toLowerCase();
    const result: Array<{
      id: string;
      handle: string;
      platform: string;
      label?: string | null;
      type: "social" | "email";
    }> = [];

    // Primary login email
    if (accountPickerCategory === "all" || accountPickerCategory === "email") {
      if (
        currentUserEmail &&
        (!q || currentUserEmail.toLowerCase().includes(q)) &&
        !savedAccounts.some((a) => a.handle.toLowerCase() === currentUserEmail.toLowerCase())
      ) {
        result.push({
          id: "primary_email",
          handle: currentUserEmail,
          platform: "Email",
          label: isEn ? "Primary Login Email" : "Email Login Utama",
          type: "email",
        });
      }
    }

    // Saved accounts
    savedAccounts.forEach((acc) => {
      const isEmail =
        acc.platform.toLowerCase().includes("email") ||
        acc.platform.toLowerCase().includes("mail");
      if (accountPickerCategory === "socials" && isEmail) return;
      if (accountPickerCategory === "email" && !isEmail) return;

      if (
        !q ||
        acc.handle.toLowerCase().includes(q) ||
        (acc.label && acc.label.toLowerCase().includes(q)) ||
        acc.platform.toLowerCase().includes(q)
      ) {
        result.push({
          id: acc.id,
          handle: acc.handle,
          platform: acc.platform,
          label: acc.label,
          type: isEmail ? "email" : "social",
        });
      }
    });

    return result;
  }, [accountPickerSearch, accountPickerCategory, savedAccounts, currentUserEmail, isEn]);

  // Filtered Wallets
  const filteredWallets = useMemo(() => {
    const q = walletSearch.trim().toLowerCase();
    if (!q) return savedWallets;
    return savedWallets.filter(
      (w) =>
        w.address.toLowerCase().includes(q) ||
        (w.label && w.label.toLowerCase().includes(q)) ||
        (w.chain && w.chain.toLowerCase().includes(q))
    );
  }, [walletSearch, savedWallets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(isEn ? "Project name is required." : "Nama project wajib diisi.");
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
        throw new Error(isEn ? "Session expired. Please log in again." : "Sesi login tidak valid. Silakan login ulang.");
      }

      // 1. Build and sanitize social links with routine type & claim url
      const rawSocialLinks: Record<string, any> = {
        task_type: taskType,
      };
      if (claimUrl.trim()) rawSocialLinks.claim_url = claimUrl.trim();
      if (website.trim()) rawSocialLinks.website = website.trim();
      if (dappUrl.trim()) rawSocialLinks.dapp_url = dappUrl.trim();
      if (faucetUrl.trim()) rawSocialLinks.faucet_url = faucetUrl.trim();
      if (docsUrl.trim()) rawSocialLinks.docs_url = docsUrl.trim();
      if (twitter.trim()) rawSocialLinks.twitter = twitter.trim();
      if (telegram.trim()) rawSocialLinks.telegram = telegram.trim();
      if (telegramPostUrl.trim()) rawSocialLinks.telegram_post_url = telegramPostUrl.trim();
      if (discord.trim()) rawSocialLinks.discord = discord.trim();
      if (refLink.trim()) rawSocialLinks.ref_link = refLink.trim();

      const safeSocialLinks = sanitizeJsonObject(rawSocialLinks);
      const safeName = sanitizeSurrogates(name).trim() || "Airdrop Project";
      const safeChain = sanitizeSurrogates(chain).trim() || "Multi-chain";
      const safeGuideContent = sanitizeSurrogates(guideContent);

      // 2. Insert into projects table
      const { data: projectData, error: projErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          folder_id: folderId || null,
          name: safeName,
          chain: safeChain,
          status: status,
          social_links: safeSocialLinks,
          guide_content: safeGuideContent,
        })
        .select("id")
        .single();

      if (projErr || !projectData) {
        throw projErr || new Error("Gagal menyimpan data project ke database.");
      }

      const newProjectId = projectData.id;

      // 3. Link Selected Wallets into project_wallets table
      if (selectedWalletIds.length > 0) {
        const walletRows = selectedWalletIds.map((wid) => ({
          project_id: newProjectId,
          wallet_id: wid,
        }));
        const { error: walletLinkErr } = await supabase
          .from("project_wallets")
          .insert(walletRows);
        if (walletLinkErr) {
          console.warn("ProjectReviewModal: Failed to link project wallets:", walletLinkErr);
        }
      }

      // 4. Create reminder if scheduled
      if (reminderOption !== "none") {
        try {
          const scheduleType: ReminderScheduleType = reminderOption;
          const encodedFreq = encodeFrequency(
            scheduleType,
            reminderTime,
            reminderDays,
            reminderDate
          );
          const nextTriggerIso = calculateNextTrigger(
            scheduleType,
            reminderTime,
            reminderDays,
            reminderDate
          );

          const { error: reminderErr } = await supabase.from("reminders").insert({
            user_id: user.id,
            project_id: newProjectId,
            task_id: null,
            frequency: encodedFreq,
            channel: ["app"],
            next_trigger_at: nextTriggerIso,
          });

          if (reminderErr) {
            console.warn("Reminder insert warning:", reminderErr);
          }
        } catch (rErr) {
          console.warn("Error calculating/saving reminder:", rErr);
        }
      }

      // 5. Insert account if filled
      if (accountValue.trim()) {
        const finalPlatform =
          accountLabel === "Lainnya"
            ? customPlatform.trim() || (isEn ? "Other" : "Lainnya")
            : accountLabel;
        await supabase.from("accounts").insert({
          project_id: newProjectId,
          label: sanitizeSurrogates(finalPlatform).trim() || "Akun Terkait",
          username_email: sanitizeSurrogates(accountValue).trim(),
        });
      }

      // 5. Update origin status
      if (source === "feed" && feedItem?.id) {
        await supabase
          .from("airdrop_feeds")
          .update({ is_imported: true })
          .eq("id", feedItem.id);
      } else if (source === "waitlist" && waitlistItem?.id) {
        await supabase
          .from("waitlists")
          .update({ status: "joined" })
          .eq("id", waitlistItem.id);
      }

      // 6. Close and navigate
      onClose();
      if (onSuccess) {
        onSuccess(newProjectId);
      } else {
        router.push(`/projects/${newProjectId}`);
      }
    } catch (err: any) {
      console.error("ProjectReviewModal save error:", err);
      setErrorMessage(err?.message || (isEn ? "An error occurred while creating the project." : "Terjadi kesalahan saat membuat proyek."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Review & Refine Project Data" : "Review & Rapikan Data Proyek"}
      description={isEn ? "Check and adjust farming routine & lifecycle data before adding to Droppr." : "Periksa dan sesuaikan rutinitas & siklus garapan sebelum resmi ditambahkan ke Droppr."}
      maxWidth="5xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        {/* Modal Body - Scrollable with comfortable breathing room */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(90vh-130px)] font-sans">
          {/* Top Info Banner */}
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/25 flex items-start gap-3 text-body-sm text-text-secondary">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold text-text-primary">
                {isEn ? "Automatic Extraction Complete: " : "Ekstraksi Otomatis Selesai: "}
              </span>
              {isEn
                ? "Important links, routine type, blockchain, and account details have been organized. Customize the status and reminder options below."
                : "Tautan penting, tipe rutinitas, blockchain, dan akun sudah dirapikan otomatis. Sesuaikan status garapan dan opsi pengingat di bawah ini."}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-status-danger/15 border border-status-danger/30 text-status-danger text-body-sm">
              {errorMessage}
            </div>
          )}

          {/* SECTION 1: Identitas Proyek & Siklus Garapan */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
            <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>{isEn ? "Project Identity & Farming Type" : "Identitas Proyek & Karakter Garapan"}</span>
            </h4>

            <div className="space-y-1">
              <label className="text-caption font-medium text-text-secondary">
                {isEn ? "Project Name" : "Nama Proyek"} <span className="text-status-danger">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? "Airdrop / Project Name" : "Nama Airdrop / Proyek"}
                required
                className="font-bold text-body-md"
              />
            </div>

            {/* 4-column responsive grid for Status, Routine Type, Chain, and Folder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <CustomSelect
                  label={isEn ? "Lifecycle Status" : "Status Garapan"}
                  value={status}
                  onChange={(val) => setStatus(val as ProjectStatus)}
                  options={[
                    { value: "not_started", label: isEn ? "Not Started" : "Belum Mulai", icon: <PauseCircle className="w-3.5 h-3.5 text-text-tertiary" /> },
                    { value: "in_progress", label: isEn ? "In Progress" : "Sedang Dikerjakan", icon: <Play className="w-3.5 h-3.5 text-status-in-progress" /> },
                    { value: "waiting", label: isEn ? "Waiting Snapshot/TGE" : "Menunggu Snapshot/TGE", icon: <Hourglass className="w-3.5 h-3.5 text-purple-400" /> },
                    { value: "ready_to_claim", label: isEn ? "Ready to Claim" : "Siap Klaim Reward", icon: <Gift className="w-3.5 h-3.5 text-amber-400" /> },
                    { value: "completed", label: isEn ? "Completed" : "Selesai Diklaim", icon: <CheckCircle2 className="w-3.5 h-3.5 text-status-completed" /> },
                  ]}
                />
              </div>

              <div>
                <CustomSelect
                  label={isEn ? "Routine Frequency" : "Tipe Rutinitas Pengerjaan"}
                  value={taskType}
                  onChange={(val) => setTaskType(val as RoutineType)}
                  options={[
                    { value: "daily", label: isEn ? "Daily Check-in (07:00 WIB)" : "Check-in Harian", icon: <Clock className="w-3.5 h-3.5 text-accent" /> },
                    { value: "weekly", label: isEn ? "Weekly / Periodic" : "Mingguan / Berkala", icon: <Repeat className="w-3.5 h-3.5 text-link-teal" /> },
                    { value: "one_time", label: isEn ? "One-Time (Set & Forget)" : "Sekali Selesai", icon: <CheckSquare className="w-3.5 h-3.5 text-status-completed" /> },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary">Chain / Network</label>
                <Input
                  type="text"
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  placeholder={isEn ? "Multi-chain, EVM, Solana" : "Multi-chain, EVM, Solana"}
                />
              </div>

              <div>
                <CustomSelect
                  label={isEn ? "Folder (Optional)" : "Folder (Opsional)"}
                  value={folderId}
                  onChange={(val) => setFolderId(val)}
                  placeholder={isEn ? "No Folder" : "Tanpa Folder"}
                  options={[
                    { value: "", label: isEn ? "No Folder" : "Tanpa Folder" },
                    ...folders.map((f) => ({
                      value: f.id,
                      label: f.name,
                      icon: <Folder className="w-3.5 h-3.5 text-text-tertiary" />,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* If ready_to_claim is selected, provide an input for the Claim / Checker portal link */}
            {status === "ready_to_claim" && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-fadeIn">
                <label className="text-caption font-bold text-amber-400 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  <span>{isEn ? "Claim / Allocation Checker Link" : "Link Portal Klaim / Checker Alokasi Airdrop"}</span>
                </label>
                <Input
                  type="url"
                  value={claimUrl}
                  onChange={(e) => setClaimUrl(e.target.value)}
                  placeholder="https://claim.project.xyz atau https://airdrop.project.xyz/check"
                  className="font-mono text-body-sm"
                />
                <p className="text-[11px] text-text-tertiary">
                  {isEn
                    ? "Droppr will show a direct claim button in your task hub and project dashboard."
                    : "Droppr akan menampilkan tombol langsung untuk klaim reward di status garapan & detail proyek."}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 2: Tautan Penting (Resource Links) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
            <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <span>{isEn ? "Resource & Community Links" : "Tautan Penting & Komunitas"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  <span>{isEn ? "DApp / Testnet Link" : "DApp / Link Testnet"}</span>
                </label>
                <Input
                  type="url"
                  value={dappUrl}
                  onChange={(e) => setDappUrl(e.target.value)}
                  placeholder="https://testnet.project.xyz"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>{isEn ? "Official Website" : "Website Resmi"}</span>
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://project.xyz"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-link-teal" />
                  <span>{isEn ? "Token Faucet" : "Faucet Token"}</span>
                </label>
                <Input
                  type="url"
                  value={faucetUrl}
                  onChange={(e) => setFaucetUrl(e.target.value)}
                  placeholder="https://faucet.project.xyz"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>{isEn ? "Docs" : "Dokumentasi / Docs"}</span>
                </label>
                <Input
                  type="url"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://docs.project.xyz"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>X (Twitter) URL</span>
                </label>
                <Input
                  type="url"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://x.com/project"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>Discord Server</span>
                </label>
                <Input
                  type="url"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="https://discord.gg/..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>Telegram Link</span>
                </label>
                <Input
                  type="url"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-accent" />
                  <span>{isEn ? "Referral Link" : "Link Referral"}</span>
                </label>
                <Input
                  type="url"
                  value={refLink}
                  onChange={(e) => setRefLink(e.target.value)}
                  placeholder="https://...?ref=..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: DOMPET & AKUN YANG DIGUNAKAN (ASSIGNED WALLETS & LINKED ACCOUNTS) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Wallets & Accounts Used" : "Dompet & Akun yang Digunakan"}</span>
                </h4>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {isEn
                    ? "Assign the wallet and registered identity so multi-account farming stays organized."
                    : "Tentukan wallet dan akun pendaftar agar riwayat multi-akun garapan ini tidak tertukar."}
                </p>
              </div>
              {selectedWalletIds.length > 0 && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{selectedWalletIds.length} {isEn ? "Wallets Selected" : "Dompet Dipilih"}</span>
                </span>
              )}
            </div>

            {/* PART A: DOMPET YANG DIGUNAKAN (ASSIGNED WALLETS) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-caption font-semibold text-text-primary">
                    {isEn ? "Assigned Wallets to Project" : "Dompet yang Dipasangkan ke Proyek"}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    ({savedWallets.length} {isEn ? "available" : "tersedia"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddWalletOpen(!isQuickAddWalletOpen)}
                  className="text-caption font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? "Quick Add Wallet" : "Tambah Dompet Cepat"}</span>
                </button>
              </div>

              {/* Connected Browser Wallet Detector */}
              {connectedAddress && (
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-status-completed shrink-0" />
                    <span className="text-text-secondary truncate">
                      {isEn ? "Connected Browser: " : "Browser Terkoneksi: "}
                      <strong className="font-mono text-text-primary">
                        {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                      </strong>
                    </span>
                  </div>
                  {savedWallets.some((w) => w.address.toLowerCase() === connectedAddress.toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const match = savedWallets.find((w) => w.address.toLowerCase() === connectedAddress.toLowerCase());
                        if (match) handleToggleWallet(match.id);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded font-mono text-accent hover:underline font-semibold shrink-0"
                    >
                      {selectedWalletIds.some((id) => savedWallets.find((w) => w.id === id)?.address.toLowerCase() === connectedAddress.toLowerCase())
                        ? (isEn ? "Selected ✓" : "Sudah Dipilih ✓")
                        : (isEn ? "Select This Wallet" : "Pilih Dompet Ini")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickWalletAddress(connectedAddress);
                        setQuickWalletLabel("Browser Wallet");
                        setQuickWalletChain("EVM");
                        setIsQuickAddWalletOpen(true);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-lg bg-accent/20 border border-accent/40 text-accent font-semibold hover:bg-accent/30 transition-colors shrink-0 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isEn ? "Save & Select" : "Simpan & Pilih"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Search bar for wallets if many */}
              {savedWallets.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={walletSearch}
                    onChange={(e) => setWalletSearch(e.target.value)}
                    placeholder={isEn ? "Filter wallets by label, chain, or address..." : "Filter dompet berdasarkan label, chain, atau address..."}
                    className="w-full pl-9 pr-7 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono"
                  />
                  {walletSearch && (
                    <button
                      type="button"
                      onClick={() => setWalletSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Inline Quick Add Wallet Drawer */}
              {isQuickAddWalletOpen && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-accent/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-bold text-accent">
                      {isEn ? "Add New Wallet to Workspace" : "Tambah Dompet Baru ke Workspace"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickAddWalletOpen(false);
                        setQuickWalletError(null);
                      }}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-mono text-text-secondary">
                        {isEn ? "Public Address" : "Alamat Publik (Address)"} <span className="text-status-danger">*</span>
                      </label>
                      <Input
                        type="text"
                        value={quickWalletAddress}
                        onChange={(e) => {
                          setQuickWalletAddress(e.target.value);
                          if (quickWalletError) setQuickWalletError(null);
                        }}
                        placeholder="0x... atau address Solana"
                        className="font-mono text-caption"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-text-secondary">Chain / Network</label>
                      <Input
                        type="text"
                        value={quickWalletChain}
                        onChange={(e) => setQuickWalletChain(e.target.value)}
                        placeholder="EVM, Solana, Base"
                        className="text-caption"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] font-mono text-text-secondary">
                        {isEn ? "Wallet Label" : "Label Dompet"} (Opsional)
                      </label>
                      <Input
                        type="text"
                        value={quickWalletLabel}
                        onChange={(e) => setQuickWalletLabel(e.target.value)}
                        placeholder="Misal: Main EVM, Tuyul 1, Backpack"
                        className="text-caption"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveQuickWallet}
                      disabled={isSavingQuickWallet || !quickWalletAddress.trim()}
                      className="px-4 py-2 rounded-xl bg-accent text-on-accent font-semibold text-caption hover:bg-accent-hover transition-colors shrink-0 self-end disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isSavingQuickWallet ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? "Saving..." : "Menyimpan..."}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isEn ? "Save & Select" : "Simpan & Pilih"}</span>
                        </>
                      )}
                    </button>
                  </div>
                  {quickWalletError && (
                    <p className="text-[11px] text-status-danger">{quickWalletError}</p>
                  )}
                </div>
              )}

              {/* Wallets Grid / Cards */}
              {savedWallets.length === 0 && !isQuickAddWalletOpen ? (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-caption text-text-tertiary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    {isEn
                      ? "No wallets saved yet in your workspace."
                      : "Belum ada dompet tersimpan di ruang kerja Anda."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddWalletOpen(true)}
                    className="text-accent hover:underline font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? "Add Wallet Now" : "Tambah Dompet Sekarang"}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredWallets.map((w) => {
                    const isSelected = selectedWalletIds.includes(w.id);
                    const shortAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
                    return (
                      <div
                        key={w.id}
                        onClick={() => handleToggleWallet(w.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-accent/15 border-accent text-accent shadow-xs ring-1 ring-accent/30"
                            : "bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-body-sm font-semibold truncate text-text-primary">
                              {w.label || "Wallet"}
                            </span>
                            {w.chain && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase border ${
                                  isSelected
                                    ? "bg-accent/20 text-accent border-accent/40"
                                    : "bg-white/[0.06] text-text-tertiary border-white/[0.1]"
                                }`}
                              >
                                {w.chain}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-text-tertiary mt-0.5 truncate">
                            {shortAddr}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-accent border-accent text-black"
                              : "border-white/[0.2] bg-white/[0.02]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                  {filteredWallets.length === 0 && savedWallets.length > 0 && (
                    <div className="col-span-full py-4 text-center text-[11px] text-text-tertiary">
                      {isEn
                        ? `No wallets matched "${walletSearch}".`
                        : `Tidak ada dompet yang cocok dengan "${walletSearch}".`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PART B: AKUN & IDENTITAS PENDAFTAR (LINKED ACCOUNTS / SOCIALS) */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-accent" />
                    <span>{isEn ? "Registered Account / Social Identity" : "Akun / Identitas Pendaftar (Non-Sensitif)"}</span>
                  </span>
                  <p className="text-[11px] text-text-tertiary">
                    {isEn
                      ? "Click a saved identity below to auto-fill, or type manually."
                      : "Klik salah satu akun tersimpan di bawah untuk mengisi instan, atau ketik manual."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddAccountOpen(!isQuickAddAccountOpen)}
                  className="text-caption font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? "Quick Add Account" : "Tambah Akun Cepat"}</span>
                </button>
              </div>

              {/* Quick Picker Category Tabs + Mini Search Bar */}
              {(accountCategoryCounts.all > 0 || currentUserEmail) && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setAccountPickerCategory("all")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          accountPickerCategory === "all"
                            ? "bg-accent text-on-accent shadow-xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {isEn ? "All" : "Semua"} ({accountCategoryCounts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountPickerCategory("socials")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          accountPickerCategory === "socials"
                            ? "bg-accent text-on-accent shadow-xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {isEn ? "Socials" : "Sosial"} ({accountCategoryCounts.socials})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountPickerCategory("email")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          accountPickerCategory === "email"
                            ? "bg-accent text-on-accent shadow-xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Email ({accountCategoryCounts.email})
                      </button>
                    </div>

                    <div className="relative flex-1 sm:max-w-[200px]">
                      <Search className="w-3 h-3 text-text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={accountPickerSearch}
                        onChange={(e) => setAccountPickerSearch(e.target.value)}
                        placeholder={isEn ? "Filter accounts..." : "Cari akun..."}
                        className="w-full pl-7 pr-6 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                      />
                      {accountPickerSearch && (
                        <button
                          type="button"
                          onClick={() => setAccountPickerSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {filteredAccounts.map((item) => {
                      const isSelected = accountValue.toLowerCase() === item.handle.toLowerCase();
                      const isTwitter =
                        item.platform.toLowerCase().includes("twitter") ||
                        item.platform.toLowerCase().includes("x");
                      const isDiscord = item.platform.toLowerCase().includes("discord");
                      const isTelegram = item.platform.toLowerCase().includes("telegram");
                      const isEmail = item.type === "email";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handlePrefillAccount(item.handle, item.platform)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                            isSelected
                              ? "bg-accent text-on-accent border-accent font-semibold shadow-xs ring-1 ring-accent"
                              : "bg-white/[0.04] text-text-primary border-white/[0.08] hover:border-accent hover:text-accent"
                          }`}
                          title={`${item.label || item.platform}: ${item.handle}`}
                        >
                          {isTwitter && <AtSign className="w-3.5 h-3.5 text-[#1DA1F2] shrink-0" />}
                          {isDiscord && <MessageSquare className="w-3.5 h-3.5 text-[#5865F2] shrink-0" />}
                          {isTelegram && <Send className="w-3.5 h-3.5 text-[#229ED9] shrink-0" />}
                          {isEmail && <Mail className="w-3.5 h-3.5 text-accent shrink-0" />}
                          {!isTwitter && !isDiscord && !isTelegram && !isEmail && (
                            <UserCheck className="w-3.5 h-3.5 text-link-teal shrink-0" />
                          )}
                          <span className="truncate max-w-[170px]">
                            {item.label ? `${item.label}: ` : ""}{item.handle}
                          </span>
                          {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                        </button>
                      );
                    })}
                    {filteredAccounts.length === 0 && (
                      <div className="w-full py-2 text-center text-[11px] text-text-tertiary">
                        {isEn ? `No accounts matched "${accountPickerSearch}".` : `Tidak ada akun yang cocok dengan "${accountPickerSearch}".`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inline Quick Add Account Drawer */}
              {isQuickAddAccountOpen && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-accent/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-bold text-accent">
                      {isEn ? "Add New Account to Workspace" : "Tambah Akun Baru ke Workspace"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickAddAccountOpen(false);
                        setQuickAccountError(null);
                      }}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <CustomSelect
                        label={isEn ? "Platform" : "Platform"}
                        value={quickAccountPlatform}
                        onChange={(val) => setQuickAccountPlatform(val)}
                        size="sm"
                        options={[
                          { value: "Twitter / X", label: "Twitter / X" },
                          { value: "Discord", label: "Discord" },
                          { value: "Telegram", label: "Telegram" },
                          { value: "Email", label: "Email" },
                          { value: "Google", label: "Google" },
                          { value: "GitHub", label: "GitHub" },
                          { value: "Lainnya", label: isEn ? "Other" : "Lainnya" },
                        ]}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-mono text-text-secondary">
                        {isEn ? "Username / Handle / Email" : "Username / Handle / Email"} <span className="text-status-danger">*</span>
                      </label>
                      <Input
                        type="text"
                        value={quickAccountHandle}
                        onChange={(e) => {
                          setQuickAccountHandle(e.target.value);
                          if (quickAccountError) setQuickAccountError(null);
                        }}
                        placeholder="Misal: @hunter_airdrop atau hunter@gmail.com"
                        className="font-mono text-caption"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] font-mono text-text-secondary">
                        {isEn ? "Account Label" : "Label Akun"} (Opsional)
                      </label>
                      <Input
                        type="text"
                        value={quickAccountLabel}
                        onChange={(e) => setQuickAccountLabel(e.target.value)}
                        placeholder="Misal: Akun Twitter Utama, Discord Burner"
                        className="text-caption"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveQuickAccount}
                      disabled={isSavingQuickAccount || !quickAccountHandle.trim()}
                      className="px-4 py-2 rounded-xl bg-accent text-on-accent font-semibold text-caption hover:bg-accent-hover transition-colors shrink-0 self-end disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isSavingQuickAccount ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? "Saving..." : "Menyimpan..."}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isEn ? "Save & Select" : "Simpan & Pilih"}</span>
                        </>
                      )}
                    </button>
                  </div>
                  {quickAccountError && (
                    <p className="text-[11px] text-status-danger">{quickAccountError}</p>
                  )}
                </div>
              )}

              {/* Form Input Platform & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <CustomSelect
                    label={isEn ? "Account Platform" : "Platform Akun"}
                    value={accountLabel}
                    onChange={(val) => setAccountLabel(val)}
                    options={[
                      { value: "Email", label: "Email" },
                      { value: "Twitter / X", label: "Twitter / X" },
                      { value: "Discord", label: "Discord" },
                      { value: "Telegram", label: "Telegram" },
                      { value: "Wallet Address", label: "Wallet Address" },
                      { value: "Google", label: "Google" },
                      { value: "GitHub", label: "GitHub" },
                      { value: "Akun Pendaftar", label: isEn ? "Registered Account" : "Akun Pendaftar" },
                      { value: "Lainnya", label: isEn ? "Other / Custom" : "Lainnya / Kustom" },
                    ]}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1">
                    <AtSign className="w-3.5 h-3.5 text-accent" />
                    <span>{isEn ? "Username / Address / Email (Non-Sensitive)" : "Username / Alamat / Email (Non-Sensitif)"}</span>
                  </label>
                  <Input
                    type="text"
                    value={accountValue}
                    onChange={(e) => setAccountValue(e.target.value)}
                    placeholder={isEn ? "e.g. @padilaqila or hunter@gmail.com" : "Misal: @padilaqila atau hunter@gmail.com"}
                  />
                </div>
              </div>

              {accountLabel === "Lainnya" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-secondary">
                    {isEn ? "Custom Platform Name" : "Nama Platform Kustom"} <span className="text-status-danger">*</span>
                  </label>
                  <Input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    placeholder="Misal: Reddit, Zealy, Galxe, Medium"
                    className="text-caption"
                  />
                </div>
              )}

              {/* Smart Suggestion Chip if typed value is not saved in workspace */}
              {accountValue.trim().length >= 3 &&
                !savedAccounts.some((a) => a.handle.toLowerCase() === accountValue.trim().toLowerCase()) &&
                (!currentUserEmail || currentUserEmail.toLowerCase() !== accountValue.trim().toLowerCase()) &&
                !savedWallets.some((w) => w.address.toLowerCase() === accountValue.trim().toLowerCase()) && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20 text-[11px] text-accent animate-fadeIn">
                    <span className="truncate">
                      {isEn
                        ? `Save "${accountValue}" to your workspace accounts?`
                        : `Simpan "${accountValue}" ke daftar Akun Workspace Anda?`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrefillQuickAddAccount(accountValue)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors shrink-0 text-[10px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isEn ? "Save to Data" : "Simpan ke Data"}</span>
                    </button>
                  </div>
              )}
            </div>
          </div>

          {/* SECTION 3: ATUR PENGINGAT CEPAT (SPACIOUS & UNCOMPRESSED) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <span>{isEn ? "Quick Reminder Setup" : "Atur Pengingat Cepat"}</span>
              </h4>
              {reminderOption !== "none" && (
                <span className="text-[11px] font-mono text-accent font-semibold flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {reminderOption === "daily"
                      ? isEn ? `Daily alert active (${reminderTime} WIB)` : `Pengingat harian aktif (${reminderTime} WIB)`
                      : reminderOption === "once"
                      ? isEn ? `One-time alert (${reminderDate})` : `Pengingat sekali (${reminderDate})`
                      : isEn ? "Weekly alert active" : "Pengingat mingguan aktif"}
                  </span>
                </span>
              )}
            </div>

            {/* 4 Spacious, Uncompressed Cards across the grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setReminderOption("daily")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  reminderOption === "daily"
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5" />
                  <span className="text-[11px] font-mono opacity-80">07:00 WIB</span>
                </div>
                <div>
                  <div className="font-bold text-body-sm text-text-primary">
                    {isEn ? "Everyday" : "Setiap Hari"}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {isEn ? "Daily check-in alert" : "Reset jam 07:00 WIB"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReminderOption("once")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  reminderOption === "once"
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Calendar className="w-5 h-5" />
                  <span className="text-[11px] font-mono opacity-80">{isEn ? "Custom" : "Pilih Tgl"}</span>
                </div>
                <div>
                  <div className="font-bold text-body-sm text-text-primary">
                    {isEn ? "Once" : "Hanya Sekali"}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {isEn ? "Deadline / Snapshot" : "Alarm deadline/snapshot"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReminderOption("weekly")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  reminderOption === "weekly"
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Repeat className="w-5 h-5" />
                  <span className="text-[11px] font-mono opacity-80">{isEn ? "Days" : "Pilih Hari"}</span>
                </div>
                <div>
                  <div className="font-bold text-body-sm text-text-primary">
                    {isEn ? "Weekly" : "Mingguan"}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {isEn ? "Periodic tx reminder" : "Alarm transaksi mingguan"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReminderOption("none")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  reminderOption === "none"
                    ? "bg-white/[0.08] border-white/[0.2] text-text-primary shadow-sm"
                    : "bg-white/[0.02] border-white/[0.06] text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Zap className="w-5 h-5 opacity-60" />
                  <span className="text-[11px] font-mono opacity-60">{isEn ? "Off" : "Mati"}</span>
                </div>
                <div>
                  <div className="font-bold text-body-sm text-text-primary">
                    {isEn ? "No Reminder" : "Tanpa Alarm"}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {isEn ? "Skip alarm for now" : "Pasang nanti saja"}
                  </div>
                </div>
              </button>
            </div>

            {/* Expanded details for selected reminder option */}
            {reminderOption === "daily" && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <span>{isEn ? "Daily Reminder Time (WIB / Local):" : "Waktu Pengingat Harian (WIB):"}</span>
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-body-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">
                  {isEn
                    ? `Droppr will send an in-app reminder every day at ${reminderTime}.`
                    : `Droppr akan membunyikan pengingat harian di aplikasi setiap pukul ${reminderTime} WIB.`}
                </p>
              </div>
            )}

            {reminderOption === "once" && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>{isEn ? "Alert Date" : "Tanggal Pengingat"}</span>
                    </label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-body-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <span>{isEn ? "Alert Time" : "Waktu"}</span>
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-body-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-text-tertiary">
                  {isEn
                    ? `One-time notification scheduled for ${reminderDate} at ${reminderTime}.`
                    : `Pengingat satu kali dijadwalkan pada ${reminderDate} pukul ${reminderTime} WIB.`}
                </p>
              </div>
            )}

            {reminderOption === "weekly" && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="space-y-2">
                  <label className="text-caption font-medium text-text-secondary">
                    {isEn ? "Select Days to Remind" : "Pilih Hari Pengingat"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = reminderDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleReminderDay(d.id)}
                          className={`px-3 py-1.5 rounded-lg text-caption font-mono font-medium transition-all ${
                            isSelected
                              ? "bg-accent text-on-accent font-bold shadow-xs"
                              : "bg-white/[0.04] text-text-secondary border border-white/[0.08] hover:border-white/[0.15]"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>{isEn ? "Time (WIB / Local)" : "Waktu Pengingat"}</span>
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-body-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: POSTINGAN ASLI TELEGRAM / PANDUAN (CLEAN & COLLAPSIBLE) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                className="flex items-center gap-2 text-body-sm font-semibold text-text-primary hover:text-accent transition-colors"
              >
                <BookOpen className="w-4 h-4 text-accent" />
                <span>{isEn ? "Original Telegram Post / Guide" : "Postingan Asli Telegram / Panduan Sumber"}</span>
                {isGuideExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                )}
              </button>

              <div className="flex items-center gap-2">
                {guideContent && (
                  <button
                    type="button"
                    onClick={handleCopyGuide}
                    className="inline-flex items-center gap-1 text-caption text-text-tertiary hover:text-text-primary px-2 py-1 rounded bg-white/[0.04] transition-colors"
                  >
                    {isCopiedGuide ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedGuide ? (isEn ? "Copied" : "Tersalin") : (isEn ? "Copy" : "Salin")}</span>
                  </button>
                )}
                <span className="text-[11px] font-mono text-text-tertiary">
                  {guideContent ? `${guideContent.length} chars` : (isEn ? "Empty" : "Kosong")}
                </span>
              </div>
            </div>

            {isGuideExpanded && (
              <textarea
                rows={7}
                value={guideContent}
                onChange={(e) => setGuideContent(e.target.value)}
                placeholder={isEn ? "Original raw Telegram post content..." : "Isi postingan asli Telegram..."}
                className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono resize-y leading-relaxed animate-fadeIn"
              />
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-white/[0.08] bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-body-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            {isEn ? "Cancel" : "Batal"}
          </button>

          <ButtonPrimary
            type="submit"
            disabled={isSaving}
            className="!py-2.5 !px-6 text-body-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>{isEn ? "Saving Project..." : "Menyimpan Proyek..."}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEn ? "Save & Open Project" : "Simpan & Buka Proyek"}</span>
              </>
            )}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
