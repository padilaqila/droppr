"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/select";
import {
  Globe,
  Send,
  Droplets,
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  Star,
  Lock,
  ShieldCheck,
  Folder,
  Clock,
  Repeat,
  CheckSquare,
  PauseCircle,
  Play,
  Gift,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];

interface FolderOption {
  id: string;
  name: string;
}

export interface CustomLinkItem {
  label: string;
  url: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectRow;
  onProjectUpdated?: () => void;
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}: EditProjectModalProps) {
  const router = useRouter();
  const { isEn } = useTranslation();

  // Basic Info
  const [name, setName] = useState(project.name || "");
  const [chain, setChain] = useState(project.chain || "");
  const [folderId, setFolderId] = useState<string>(project.folder_id || "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [taskType, setTaskType] = useState<"daily" | "weekly" | "one_time">("daily");
  const [claimUrl, setClaimUrl] = useState<string>("");
  const [guideContent, setGuideContent] = useState(project.guide_content || "");

  // Structured Links
  const rawSocial = (project.social_links as Record<string, any>) || {};
  const [isPriority, setIsPriority] = useState<boolean>(Boolean(rawSocial.is_priority));
  const [website, setWebsite] = useState(rawSocial.website || "");
  const [dappUrl, setDappUrl] = useState(rawSocial.dapp_url || "");
  const [faucetUrl, setFaucetUrl] = useState(rawSocial.faucet_url || "");
  const [docsUrl, setDocsUrl] = useState(rawSocial.docs_url || "");
  const [twitter, setTwitter] = useState(rawSocial.twitter || "");
  const [telegram, setTelegram] = useState(rawSocial.telegram || "");
  const [telegramPostUrl, setTelegramPostUrl] = useState(rawSocial.telegram_post_url || "");
  const [discord, setDiscord] = useState(rawSocial.discord || "");

  // Dynamic Custom Links
  const [customLinks, setCustomLinks] = useState<CustomLinkItem[]>(
    Array.isArray(rawSocial.custom_links) ? rawSocial.custom_links : []
  );
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomUrl, setNewCustomUrl] = useState("");

  // Folders & UI state
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when project changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name || "");
      setChain(project.chain || "");
      setFolderId(project.folder_id || "");
      setStatus(project.status);
      setGuideContent(project.guide_content || "");

      const s = (project.social_links as Record<string, any>) || {};
      setIsPriority(Boolean(s.is_priority));
      setTaskType((s.task_type as any) || "daily");
      setClaimUrl(s.claim_url || "");
      setWebsite(s.website || "");
      setDappUrl(s.dapp_url || "");
      setFaucetUrl(s.faucet_url || "");
      setDocsUrl(s.docs_url || "");
      setTwitter(s.twitter || "");
      setTelegram(s.telegram || "");
      setTelegramPostUrl(s.telegram_post_url || "");
      setDiscord(s.discord || "");
      setCustomLinks(Array.isArray(s.custom_links) ? s.custom_links : []);
      setConfirmDelete(false);
      setError(null);

      // Load folders
      const supabase = createClient() as any;
      supabase
        .from("folders")
        .select("id, name")
        .order("name")
        .then(({ data }: any) => {
          if (data) setFolders(data);
        });
    }
  }, [isOpen, project]);

  const handleAddCustomLink = () => {
    if (!newCustomLabel.trim() || !newCustomUrl.trim()) return;
    setCustomLinks([
      ...customLinks,
      { label: newCustomLabel.trim(), url: newCustomUrl.trim() },
    ]);
    setNewCustomLabel("");
    setNewCustomUrl("");
  };

  const handleRemoveCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama project wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient() as any;

      const social_links: Record<string, any> = {
        ...((project.social_links as Record<string, any>) || {}),
      };

      if (website.trim()) social_links.website = website.trim();
      else delete social_links.website;

      if (dappUrl.trim()) social_links.dapp_url = dappUrl.trim();
      else delete social_links.dapp_url;

      if (faucetUrl.trim()) social_links.faucet_url = faucetUrl.trim();
      else delete social_links.faucet_url;

      if (docsUrl.trim()) social_links.docs_url = docsUrl.trim();
      else delete social_links.docs_url;

      if (twitter.trim()) social_links.twitter = twitter.trim();
      else delete social_links.twitter;

      if (telegram.trim()) social_links.telegram = telegram.trim();
      else delete social_links.telegram;

      if (telegramPostUrl.trim()) social_links.telegram_post_url = telegramPostUrl.trim();
      else delete social_links.telegram_post_url;

      if (discord.trim()) social_links.discord = discord.trim();
      else delete social_links.discord;

      if (customLinks.length > 0) {
        social_links.custom_links = customLinks;
      } else {
        delete social_links.custom_links;
      }

      social_links.task_type = taskType;
      if (claimUrl.trim()) {
        social_links.claim_url = claimUrl.trim();
      } else {
        delete social_links.claim_url;
      }

      if (isPriority) {
        social_links.is_priority = true;
      } else {
        delete social_links.is_priority;
      }

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          name: name.trim(),
          chain: chain.trim() || null,
          folder_id: folderId || null,
          status,
          social_links,
          guide_content: guideContent.trim() || null,
        })
        .eq("id", project.id);

      if (updateError) throw updateError;

      if (onProjectUpdated) {
        onProjectUpdated();
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to update project:", err);
      setError(err?.message || "Gagal menyimpan perubahan project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient() as any;

      // 1. Revert import status on airdrop_feeds if this project came from feed
      const s = (project.social_links as Record<string, any>) || {};
      const sourceUrl = s.telegram_post_url || s.telegram || s.source_url;

      if (sourceUrl && typeof sourceUrl === "string") {
        await supabase.from("airdrop_feeds").update({ is_imported: false }).eq("source_url", sourceUrl.trim());
      } else if (project.name) {
        await supabase.from("airdrop_feeds").update({ is_imported: false }).ilike("title", `%${project.name.trim()}%`);
      }

      // 2. Delete project from database
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (deleteError) throw deleteError;

      router.push("/projects");
      router.refresh();
    } catch (err: any) {
      console.error("Delete project error:", err);
      setError(err?.message || (isEn ? "Failed to delete project." : "Gagal menghapus project."));
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Edit Airdrop Project" : "Edit Proyek Airdrop"}
      description={
        isEn
          ? "Update identity information, website links, faucet, community, and guide notes."
          : "Perbarui informasi identitas, tautan website, faucet, komunitas, dan catatan panduan."
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: INFORMASI DASAR PROYEK */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
            <Layers className="w-4 h-4 text-accent shrink-0" />
            <span className="text-body-sm font-semibold text-text-primary">
              {isEn ? "Project Identity & Status" : "Identitas & Status Proyek"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Project Name" : "Nama Proyek"} <span className="text-status-overdue">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? "e.g. MINARA, Monad, Berachain" : "Contoh: MINARA, Monad, Berachain"}
                required
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Network / Chain" : "Jaringan / Chain"}
              </label>
              <input
                type="text"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                placeholder={isEn ? "e.g. Ethereum, Arbitrum, Base, Berachain" : "Contoh: Ethereum, Arbitrum, Base, Berachain"}
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <CustomSelect
                label={isEn ? "Category Folder" : "Folder Kategori"}
                value={folderId}
                onChange={(val) => setFolderId(val)}
                disabled={isSaving || isDeleting}
                placeholder={isEn ? "(Unorganized)" : "(Tanpa Folder)"}
                options={[
                  { value: "", label: isEn ? "(Unorganized)" : "(Tanpa Folder)" },
                  ...folders.map((f) => ({
                    value: f.id,
                    label: f.name,
                    icon: <Folder className="w-3.5 h-3.5 text-text-tertiary" />,
                  })),
                ]}
              />
            </div>

            <div>
              <CustomSelect
                label={isEn ? "Farming Status" : "Status Garapan"}
                value={status}
                onChange={(val) => setStatus(val as ProjectStatus)}
                disabled={isSaving || isDeleting}
                options={[
                  { value: "not_started", label: isEn ? "Not Started" : "Belum Mulai", icon: <PauseCircle className="w-3.5 h-3.5 text-text-tertiary" /> },
                  { value: "in_progress", label: isEn ? "In Progress" : "Sedang Dikerjakan", icon: <Play className="w-3.5 h-3.5 text-status-in-progress" /> },
                  { value: "waiting", label: isEn ? "Waiting for TGE / Snapshot" : "Menunggu TGE / Snapshot", icon: <Hourglass className="w-3.5 h-3.5 text-purple-400" /> },
                  { value: "ready_to_claim", label: isEn ? "Ready to Claim" : "Siap Klaim Reward", icon: <Gift className="w-3.5 h-3.5 text-amber-400" /> },
                  { value: "completed", label: isEn ? "Completed" : "Selesai / Klaim Selesai", icon: <CheckCircle2 className="w-3.5 h-3.5 text-status-completed" /> },
                ]}
              />
            </div>

            <div>
              <CustomSelect
                label={isEn ? "Routine Frequency" : "Tipe Rutinitas Pengerjaan"}
                value={taskType}
                onChange={(val) => setTaskType(val as any)}
                disabled={isSaving || isDeleting}
                options={[
                  { value: "daily", label: isEn ? "Daily Check-in (07:00 WIB)" : "Check-in Harian", icon: <Clock className="w-3.5 h-3.5 text-accent" /> },
                  { value: "weekly", label: isEn ? "Weekly / Periodic" : "Mingguan / Berkala", icon: <Repeat className="w-3.5 h-3.5 text-link-teal" /> },
                  { value: "one_time", label: isEn ? "One-Time (Set & Forget)" : "Sekali Selesai", icon: <CheckSquare className="w-3.5 h-3.5 text-status-completed" /> },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-caption font-medium text-text-secondary mb-1.5 flex items-center justify-between">
                <span>{isEn ? "Claim / Allocation Portal URL" : "Link Portal Klaim / Checker Alokasi"}</span>
                {status === "ready_to_claim" && (
                  <span className="text-[11px] text-amber-400 font-bold inline-flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    <span>Siap Klaim</span>
                  </span>
                )}
              </label>
              <input
                type="url"
                value={claimUrl}
                onChange={(e) => setClaimUrl(e.target.value)}
                placeholder="https://claim.project.xyz atau https://airdrop.project.xyz/check"
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Priority Toggle Card */}
          <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isPriority
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-white/[0.04] text-text-tertiary border border-white/[0.08]"
                }`}
              >
                <Star className={`w-4 h-4 ${isPriority ? "fill-current" : ""}`} />
              </div>
              <div className="min-w-0">
                <div className="text-body-sm font-semibold text-text-primary flex items-center gap-1.5 flex-wrap">
                  <span>{isEn ? "Priority Project" : "Proyek Prioritas"}</span>
                  {isPriority && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono font-bold border border-accent/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {isEn ? "PROTECTED" : "TERLINDUNGI"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-tertiary truncate">
                  {isEn
                    ? "Pinned to top and protected from accidental deletion."
                    : "Disematkan di posisi teratas & dilindungi dari penghapusan tidak sengaja."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPriority(!isPriority)}
              disabled={isSaving || isDeleting}
              className={`px-3 py-1.5 rounded-xl text-caption font-semibold transition-all border shrink-0 inline-flex items-center gap-1.5 ${
                isPriority
                  ? "bg-accent text-on-accent border-accent shadow-xs"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border-white/[0.1]"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isPriority ? "fill-on-accent text-on-accent" : "text-text-tertiary"}`} />
              <span>
                {isPriority
                  ? (isEn ? "Priority Active" : "Prioritas Aktif")
                  : (isEn ? "Mark Priority" : "Jadikan Prioritas")}
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 2: SITUS WEB & SUMBER DAYA UTAMA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-link-teal shrink-0" />
              <span className="text-body-sm font-semibold text-text-primary">
                {isEn ? "Websites & Primary Resources" : "Situs Web & Sumber Daya Utama"}
              </span>
            </div>
            <span className="text-[11px] text-text-tertiary">
              {isEn
                ? "Official portal links, dApp swap, and testnet faucet"
                : "Tautan portal resmi, dApp swap, dan faucet testnet"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Official Website / Info Portal" : "Website Resmi / Portal Info"}
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://project.xyz"
                  disabled={isSaving || isDeleting}
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Web App / Testnet DApp" : "Web App / DApp Testnet"}
              </label>
              <div className="relative">
                <ExternalLink className="w-4 h-4 text-accent absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={dappUrl}
                  onChange={(e) => setDappUrl(e.target.value)}
                  placeholder="https://app.project.xyz"
                  disabled={isSaving || isDeleting}
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Testnet Faucet (Gas Claim)" : "Faucet Testnet (Klaim Gas)"}
              </label>
              <div className="relative">
                <Droplets className="w-4 h-4 text-link-teal absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={faucetUrl}
                  onChange={(e) => setFaucetUrl(e.target.value)}
                  placeholder="https://faucet.project.xyz"
                  disabled={isSaving || isDeleting}
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                {isEn ? "Documentation / GitBook / Guide" : "Dokumentasi / GitBook / Panduan"}
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://docs.project.xyz"
                  disabled={isSaving || isDeleting}
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MEDIA SOSIAL & LINK POST TELEGRAM INDUK */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
            <Send className="w-4 h-4 text-accent shrink-0" />
            <span className="text-body-sm font-semibold text-text-primary">
              {isEn ? "Social Media & Telegram Source" : "Media Sosial & Sumber Telegram"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                Twitter / X
              </label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/project"
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                Discord
              </label>
              <input
                type="text"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="https://discord.gg/project"
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-1.5">
                Telegram Group/Channel
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="https://t.me/project"
                disabled={isSaving || isDeleting}
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04]">
            <label className="block text-caption font-medium text-text-secondary mb-1.5">
              {isEn
                ? "Parent Telegram Post Link (Airdrop Source)"
                : "Link Postingan Telegram Induk (Sumber Garapan)"}
            </label>
            <div className="relative">
              <Send className="w-4 h-4 text-accent absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={telegramPostUrl}
                onChange={(e) => setTelegramPostUrl(e.target.value)}
                placeholder={
                  isEn
                    ? "https://t.me/airdropfind/115116 or https://t.me/dutacryptoairdrop/4294"
                    : "https://t.me/airdropfind/115116 atau https://t.me/dutacryptoairdrop/4294"
                }
                disabled={isSaving || isDeleting}
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50 font-mono text-[13px]"
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1.5 leading-relaxed">
              {isEn
                ? "Initial message link for this airdrop on Telegram. Useful for automatic chain update tracking when channel admins post new updates."
                : "Tautan pesan awal garapan ini di Telegram. Berguna untuk melacak update berantai secara otomatis saat admin channel mengirimkan info pembaruan."}
            </p>
          </div>
        </div>

        {/* SECTION 4: TAUTAN TAMBAHAN LAINNYA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-text-secondary shrink-0" />
              <span className="text-body-sm font-semibold text-text-primary">
                {isEn ? "Additional Links" : "Tautan Tambahan"} ({customLinks.length})
              </span>
            </div>
            <span className="text-[11px] text-text-tertiary">
              Explorer, Galxe, Zealy, Guild, dsb.
            </span>
          </div>

          {customLinks.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              {customLinks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-body-sm group hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="font-medium text-text-primary text-caption shrink-0">
                      {item.label}:
                    </span>
                    <span className="text-caption text-link-teal truncate font-mono">
                      {item.url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomLink(idx)}
                    className="p-1 text-text-tertiary hover:text-status-overdue rounded-lg hover:bg-white/[0.05] transition-colors shrink-0"
                    title={isEn ? "Delete Link" : "Hapus Link"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              value={newCustomLabel}
              onChange={(e) => setNewCustomLabel(e.target.value)}
              placeholder={isEn ? "Label (e.g. Explorer)" : "Label (cth: Explorer)"}
              disabled={isSaving || isDeleting}
              className="w-full sm:w-1/3 h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
            />
            <input
              type="url"
              value={newCustomUrl}
              onChange={(e) => setNewCustomUrl(e.target.value)}
              placeholder="https://..."
              disabled={isSaving || isDeleting}
              className="w-full sm:flex-1 h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all disabled:opacity-50 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={handleAddCustomLink}
              disabled={!newCustomLabel.trim() || !newCustomUrl.trim() || isSaving || isDeleting}
              className="h-9 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-text-primary text-caption font-semibold inline-flex items-center justify-center gap-1.5 transition-all shrink-0 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>{isEn ? "Add" : "Tambah"}</span>
            </button>
          </div>
        </div>

        {/* SECTION 5: CATATAN GARAPAN / PANDUAN KERJA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3 shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
            <FileText className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="text-body-sm font-semibold text-text-primary">
              {isEn ? "Farming Notes & Work Guide" : "Catatan Garapan & Panduan Kerja"}
            </span>
          </div>

          <textarea
            rows={4}
            value={guideContent}
            onChange={(e) => setGuideContent(e.target.value)}
            placeholder={
              isEn
                ? "Write work guides, tricks, gas fee notes, or other important info..."
                : "Tulis panduan kerja, trik pengerjaan, catatan gas fee, atau info penting lainnya..."
            }
            disabled={isSaving || isDeleting}
            className="w-full p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all font-sans leading-relaxed no-scrollbar resize-none disabled:opacity-50"
          />
          <p className="text-[11px] text-text-tertiary">
            {isEn
              ? "URL links in notes will automatically become interactive links when viewed on the project timeline page."
              : "Tautan URL di dalam catatan otomatis menjadi link interaktif saat dilihat pada halaman linimasa proyek."}
          </p>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div>
            {isPriority ? (
              <div
                className="flex items-center gap-2 p-2 rounded-xl bg-accent/10 border border-accent/25 text-caption text-accent font-medium"
                title={isEn ? "Priority project is locked from deletion" : "Proyek prioritas terlindungi dari penghapusan"}
              >
                <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>
                  {isEn
                    ? "Priority Protected: Turn off priority above to enable deletion."
                    : "Prioritas Terlindungi: Matikan prioritas di atas jika ingin menghapus."}
                </span>
              </div>
            ) : confirmDelete ? (
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-status-overdue/10 border border-status-overdue/30">
                <span className="text-caption text-status-overdue font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isEn ? "Delete this project?" : "Hapus proyek ini?"}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-status-overdue text-white text-caption font-bold rounded-lg hover:bg-red-700 transition-colors shadow-xs"
                >
                  {isDeleting
                    ? (isEn ? "Deleting..." : "Menghapus...")
                    : (isEn ? "Yes, Delete" : "Ya, Hapus")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-caption text-text-tertiary hover:text-text-primary px-1.5 transition-colors"
                >
                  {isEn ? "Cancel" : "Batal"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-caption text-status-overdue/80 hover:text-status-overdue inline-flex items-center gap-1.5 py-1 transition-colors font-medium"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? "Delete Project" : "Hapus Proyek"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <ButtonSecondary
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="!py-2 !px-4 text-caption rounded-xl"
            >
              {isEn ? "Cancel" : "Batal"}
            </ButtonSecondary>
            <ButtonPrimary
              type="submit"
              disabled={isSaving || isDeleting}
              className="!py-2 !px-5 text-caption rounded-xl"
            >
              {isSaving
                ? (isEn ? "Saving..." : "Menyimpan...")
                : (isEn ? "Save Changes" : "Simpan Perubahan")}
            </ButtonPrimary>
          </div>
        </div>
      </form>
    </Modal>
  );
}
