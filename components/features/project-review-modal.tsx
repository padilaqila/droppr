"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { parseAirdropProjectData } from "@/lib/supabase/airdrop-parser";
import { sanitizeSurrogates, sanitizeJsonObject } from "@/lib/supabase/thread-updates";
import {
  calculateNextTrigger,
  encodeFrequency,
  DAYS_OF_WEEK,
  type ReminderScheduleType,
} from "@/lib/supabase/reminders-helper";
import { createClient } from "@/lib/supabase/client";
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

  // Account
  const [accountLabel, setAccountLabel] = useState("Email");
  const [accountValue, setAccountValue] = useState("");

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

  // Load folders once
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
  }, [isOpen]);

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

      // 3. Create reminder if scheduled
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

      // 4. Insert account if filled
      if (accountValue.trim()) {
        await supabase.from("accounts").insert({
          project_id: newProjectId,
          label: sanitizeSurrogates(accountLabel).trim() || "Akun Terkait",
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

          {/* SECTION 2: Tautan Penting (Resource Links) & Akun */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
            <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <span>{isEn ? "Resource Links & Linked Account" : "Tautan Penting & Akun Terkait"}</span>
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

            {/* Linked Account Sub-section */}
            <div className="pt-3 border-t border-white/[0.05]">
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
                      { value: "Akun Pendaftar", label: isEn ? "Registered Account" : "Akun Pendaftar" },
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
