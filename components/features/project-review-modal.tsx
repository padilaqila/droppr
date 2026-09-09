"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Send,
  MessageSquare,
  Droplets,
  Layers,
  BookOpen,
  Share2,
  Trash2,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
  AtSign,
  Check,
} from "lucide-react";
import { parseAirdropProjectData } from "@/lib/supabase/airdrop-parser";
import { sanitizeSurrogates, sanitizeJsonObject } from "@/lib/supabase/thread-updates";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { AirdropFeedItem } from "@/lib/supabase/airdrop-feeds";
import type { WaitlistItem } from "@/lib/supabase/waitlists";
import { useTranslation } from "@/lib/i18n/context";

type ProjectStatus = Database["public"]["Enums"]["project_status"];

interface FolderOption {
  id: string;
  name: string;
}

interface ReviewTask {
  id: string;
  title: string;
  type: "one_time" | "daily" | "weekly";
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

  // Tasks
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<"one_time" | "daily" | "weekly">("one_time");

  // Guide / Notes
  const [guideContent, setGuideContent] = useState("");

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

    // Determine initial status
    if (source === "waitlist") {
      setStatus(waitlistItem?.status === "joined" ? "waiting" : "not_started");
    } else {
      setStatus(
        feedItem?.category === "testnet" || feedItem?.category === "retro"
          ? "in_progress"
          : "not_started"
      );
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

    // Tasks
    const parsedTasks: ReviewTask[] = (parsed.tasks || []).map((t, idx) => ({
      id: `task-${idx}-${Date.now()}`,
      title: t.title,
      type: t.type === "daily" ? "daily" : "one_time",
    }));
    setTasks(parsedTasks);

    // Guide
    setGuideContent(parsed.guide_content || rawText);
  }, [isOpen, source, feedItem, waitlistItem]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `custom-task-${Date.now()}`,
        title: newTaskTitle.trim(),
        type: newTaskType,
      },
    ]);
    setNewTaskTitle("");
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTaskType = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextType: "one_time" | "daily" | "weekly" =
          t.type === "one_time" ? "daily" : t.type === "daily" ? "weekly" : "one_time";
        return { ...t, type: nextType };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama project wajib diisi.");
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
        throw new Error("Sesi login tidak valid. Silakan login ulang.");
      }

      // 1. Build and sanitize social links
      const rawSocialLinks: Record<string, any> = {};
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

      // 3. Insert tasks
      if (tasks.length > 0) {
        const taskRows = tasks
          .map((t) => ({
            project_id: newProjectId,
            title: sanitizeSurrogates(t.title).trim(),
            type: t.type,
            status: "pending" as const,
          }))
          .filter((t) => t.title.length > 0);

        if (taskRows.length > 0) {
          const { error: tasksErr } = await supabase.from("tasks").insert(taskRows);
          if (tasksErr) {
            console.warn("Tasks insert warning:", tasksErr);
          }
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
      description={isEn ? "Check and adjust farming data before adding to your Droppr workstation." : "Periksa dan sesuaikan data garapan sebelum resmi ditambahkan ke workstation Droppr Anda."}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(90vh-140px)]">
          {/* Top Info Banner */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-2.5 text-body-sm text-text-secondary">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold text-text-primary">
                {isEn ? "Automatic Extraction Complete: " : "Ekstraksi Otomatis Selesai: "}
              </span>
              {isEn
                ? "Important links, blockchain, task checklist, and account info have been formatted automatically. You can change the name, add links, or filter required tasks below."
                : "Tautan penting, blockchain, checklist tugas, dan info akun sudah dirapikan otomatis. Anda bisa mengubah nama, menambah link, atau menyaring tugas yang diperlukan di bawah ini."}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-status-danger/15 border border-status-danger/30 text-status-danger text-body-sm">
              {errorMessage}
            </div>
          )}

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Project Details & Links (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-3.5 pb-5 border-b border-border-hairline">
                <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Project Identity" : "Identitas Proyek"}</span>
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
                    className="font-semibold text-body-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-caption font-medium text-text-secondary">
                      {isEn ? "Initial Status" : "Status Awal"}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="in_progress">{isEn ? "In Progress" : "Sedang Dikerjakan"}</option>
                      <option value="waiting">{isEn ? "Waiting Snapshot/TGE" : "Menunggu Snapshot/TGE"}</option>
                      <option value="not_started">{isEn ? "Not Started" : "Belum Mulai"}</option>
                      <option value="ready_to_claim">{isEn ? "Ready to Claim" : "Siap Klaim"}</option>
                    </select>
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

                  <div className="space-y-1">
                    <label className="text-caption font-medium text-text-secondary">
                      {isEn ? "Folder (Optional)" : "Folder (Opsional)"}
                    </label>
                    <select
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="">{isEn ? "No Folder" : "Tanpa Folder"}</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resource Links Section */}
              <div className="space-y-3.5 pb-5 border-b border-border-hairline">
                <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Important Links (Resource Links)" : "Tautan Penting (Resource Links)"}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <span>{isEn ? "Documentation / Docs" : "Dokumentasi / Docs"}</span>
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

              {/* Account Section */}
              <div className="space-y-3">
                <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <AtSign className="w-4 h-4 text-accent" />
                  <span>{isEn ? "Linked Account (Non-Sensitive)" : "Akun Terkait (Non-Sensitif)"}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-caption font-medium text-text-secondary">Platform</label>
                    <select
                      value={accountLabel}
                      onChange={(e) => setAccountLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg-elevated-2 border border-border-hairline text-body-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="Email">Email</option>
                      <option value="Twitter / X">Twitter / X</option>
                      <option value="Discord">Discord</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Wallet Address">Wallet Address</option>
                      <option value="Akun Pendaftar">{isEn ? "Registered Account" : "Akun Pendaftar"}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-caption font-medium text-text-secondary">
                      {isEn ? "Username / Address / Email" : "Username / Alamat / Email"}
                    </label>
                    <Input
                      type="text"
                      value={accountValue}
                      onChange={(e) => setAccountValue(e.target.value)}
                      placeholder={isEn ? "e.g. @padilaqila or email@gmail.com" : "Misal: @padilaqila atau email@gmail.com"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Tasks Checklist & Source Guide (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Interactive Tasks Editor */}
              <div className="space-y-3 p-4 rounded-xl bg-bg-elevated-2/70 border border-border-hairline flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-body-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-accent" />
                    <span>{isEn ? `Task Checklist (${tasks.length})` : `Daftar Checklist Tugas (${tasks.length})`}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-text-tertiary">
                    {isEn ? "Click badge to toggle type" : "Klik badge ubah tipe"}
                  </span>
                </div>

                {/* Add task bar */}
                <div className="flex gap-2">
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as any)}
                    className="px-2 py-1.5 rounded-lg bg-bg-elevated border border-border-hairline text-caption text-text-primary shrink-0 focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="one_time">{isEn ? "One-time" : "Sekali"}</option>
                    <option value="daily">{isEn ? "Daily" : "Harian"}</option>
                    <option value="weekly">{isEn ? "Weekly" : "Mingguan"}</option>
                  </select>
                  <Input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={isEn ? "Add task..." : "Tambah tugas..."}
                    className="flex-1 !py-1.5 text-caption"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-3 py-1.5 rounded-lg bg-accent text-on-accent hover:bg-accent-pressed transition-colors text-caption font-semibold shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Task list container */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {tasks.length > 0 ? (
                    tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-bg-elevated border border-border-subtle hover:border-border-hairline text-caption flex items-start justify-between gap-2 transition-colors group"
                      >
                        <div className="min-w-0 flex items-start gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskType(t.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 transition-colors ${
                              t.type === "daily"
                                ? "bg-accent/15 text-accent border border-accent/30"
                                : t.type === "weekly"
                                ? "bg-link-teal/15 text-link-teal border border-link-teal/30"
                                : "bg-bg-elevated-2 text-text-secondary border border-border-subtle"
                            }`}
                            title={isEn ? "Click to switch type (One-time / Daily / Weekly)" : "Klik untuk mengganti tipe (Sekali / Harian / Mingguan)"}
                          >
                            {t.type === "daily" ? (isEn ? "Daily" : "Harian") : t.type === "weekly" ? (isEn ? "Weekly" : "Mingguan") : (isEn ? "One-time" : "Sekali")}
                          </button>
                          <span className="text-text-primary leading-tight break-words font-medium">
                            {t.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTask(t.id)}
                          className="p-1 rounded text-text-tertiary hover:text-status-danger transition-colors shrink-0"
                          title={isEn ? "Delete this task" : "Hapus tugas ini"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-caption text-text-tertiary">
                      {isEn ? "No tasks yet. Type a task above to add a checklist." : "Belum ada tugas. Ketik tugas di atas untuk menambahkan checklist pengerjaan."}
                    </div>
                  )}
                </div>
              </div>

              {/* Guide / Original text preview */}
              <div className="space-y-2">
                <label className="text-caption font-medium text-text-secondary flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-text-tertiary" />
                    <span>{isEn ? "Notes / Task Guide" : "Catatan / Panduan Pengerjaan"}</span>
                  </span>
                  <span className="text-[11px] text-text-tertiary">{isEn ? "Saved to project" : "Tersimpan di proyek"}</span>
                </label>
                <textarea
                  rows={5}
                  value={guideContent}
                  onChange={(e) => setGuideContent(e.target.value)}
                  placeholder={isEn ? "Step-by-step notes..." : "Catatan panduan langkah kerja..."}
                  className="w-full px-3 py-2 rounded-lg bg-bg-elevated-2 border border-border-hairline text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border-hairline bg-bg-elevated">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-body-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 transition-colors disabled:opacity-50"
          >
            {isEn ? "Cancel" : "Batal"}
          </button>

          <div className="flex items-center gap-2">
            <ButtonPrimary
              type="submit"
              disabled={isSaving}
              className="!py-2 !px-5 text-body-sm font-semibold inline-flex items-center gap-2 shadow-sm"
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
        </div>
      </form>
    </Modal>
  );
}
