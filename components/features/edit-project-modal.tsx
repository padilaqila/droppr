"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Send,
  MessageSquare,
  Droplets,
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

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

  // Basic Info
  const [name, setName] = useState(project.name || "");
  const [chain, setChain] = useState(project.chain || "");
  const [folderId, setFolderId] = useState<string>(project.folder_id || "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [guideContent, setGuideContent] = useState(project.guide_content || "");

  // Structured Links
  const rawSocial = (project.social_links as Record<string, any>) || {};
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

      // 1. Revert import status on airdrop_feeds & waitlists if this project came from feed/waitlist
      const s = (project.social_links as Record<string, any>) || {};
      const sourceUrl = s.telegram_post_url || s.telegram || s.source_url;

      if (sourceUrl && typeof sourceUrl === "string") {
        await Promise.allSettled([
          supabase.from("airdrop_feeds").update({ is_imported: false }).eq("source_url", sourceUrl.trim()),
          supabase.from("waitlists").update({ is_imported: false }).eq("source_url", sourceUrl.trim()),
        ]);
      } else if (project.name) {
        await Promise.allSettled([
          supabase.from("airdrop_feeds").update({ is_imported: false }).ilike("title", `%${project.name.trim()}%`),
          supabase.from("waitlists").update({ is_imported: false }).ilike("title", `%${project.name.trim()}%`),
        ]);
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
      console.error("Failed to delete project:", err);
      setError(err?.message || "Gagal menghapus project.");
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Proyek Airdrop"
      description="Ubah nama, status, multi-website, faucet link, tutorial, dan link kustom."
      maxWidth="xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
            {error}
          </div>
        )}

        {/* Section 1: Informasi Dasar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Nama Project <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Aura Network"
              required
              disabled={isSaving || isDeleting}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Chain / Jaringan
            </label>
            <Input
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              placeholder="Contoh: Arbitrum, Sepolia, Berachain"
              disabled={isSaving || isDeleting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Folder Kategori
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
              disabled={isSaving || isDeleting}
            >
              <option value="">(Tanpa Folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Status Lifecycle
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent cursor-pointer"
              disabled={isSaving || isDeleting}
            >
              <option value="not_started">Belum Mulai</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="waiting">Menunggu TGE / Snapshot</option>
              <option value="ready_to_claim">Siap Klaim</option>
              <option value="completed">Selesai / Klaim Selesai</option>
            </select>
          </div>
        </div>

        {/* Section 2: Website & Sumber Daya Airdrop Utama (Menjawab isu multi-web & faucet) */}
        <div className="space-y-3 pt-2 border-t border-border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-accent" />
              <span>Situs Web & Sumber Daya Utama</span>
            </span>
            <span className="text-caption text-text-tertiary">
              Bedakan web resmi, portal dApp, dan faucet
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Website 1: Web Resmi */}
            <div>
              <label className="block text-caption text-text-secondary mb-1">
                🌐 Website Resmi / Portal Info
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://project.xyz"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving || isDeleting}
                />
              </div>
            </div>

            {/* Website 2: DApp / Testnet App */}
            <div>
              <label className="block text-caption text-text-secondary mb-1">
                🚀 Web App / DApp Testnet (Web ke-2)
              </label>
              <div className="relative">
                <ExternalLink className="w-4 h-4 text-accent absolute left-3 top-3 pointer-events-none" />
                <input
                  type="url"
                  value={dappUrl}
                  onChange={(e) => setDappUrl(e.target.value)}
                  placeholder="https://app.project.xyz atau swap portal"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving || isDeleting}
                />
              </div>
            </div>

            {/* Link Faucet */}
            <div>
              <label className="block text-caption text-text-secondary mb-1">
                🚰 Link Faucet (Klaim Saldo Testnet)
              </label>
              <div className="relative">
                <Droplets className="w-4 h-4 text-link-teal absolute left-3 top-3 pointer-events-none" />
                <input
                  type="url"
                  value={faucetUrl}
                  onChange={(e) => setFaucetUrl(e.target.value)}
                  placeholder="https://faucet.project.xyz"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving || isDeleting}
                />
              </div>
            </div>

            {/* Docs */}
            <div>
              <label className="block text-caption text-text-secondary mb-1">
                📚 Dokumentasi / GitBook / Panduan Resmi
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
                <input
                  type="url"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://docs.project.xyz"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving || isDeleting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Akun Sosial Media */}
        <div className="space-y-3 pt-2 border-t border-border-hairline">
          <span className="text-body-sm font-semibold text-text-primary block">
            Media Sosial & Komunitas
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <span className="text-body-sm font-bold text-text-tertiary absolute left-3 top-2 pointer-events-none">
                𝕏
              </span>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="Twitter / X (@handle)"
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                disabled={isSaving || isDeleting}
              />
            </div>
            <div className="relative">
              <Send className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="Telegram (t.me/...)"
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                disabled={isSaving || isDeleting}
              />
            </div>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="Discord Invite URL"
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                disabled={isSaving || isDeleting}
              />
            </div>
          </div>

          {/* Telegram Root Post Link (For Update Tracking) */}
          <div className="pt-2">
            <label className="block text-caption text-text-secondary mb-1">
              📌 Link Postingan Telegram Induk / Sumber Garapan
            </label>
            <div className="relative">
              <Send className="w-4 h-4 text-accent absolute left-3 top-3 pointer-events-none" />
              <input
                type="url"
                value={telegramPostUrl}
                onChange={(e) => setTelegramPostUrl(e.target.value)}
                placeholder="https://t.me/airdropfind/115116 atau https://t.me/dutacryptoairdrop/4294"
                className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                disabled={isSaving || isDeleting}
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">
              Tautan postingan awal garapan ini di Telegram. Berguna untuk melacak update berantai otomatis meskipun admin channel hanya me-reply post ini.
            </p>
          </div>
        </div>

        {/* Section 4: Link Kustom Tambahan (Explorer, Galxe, Zealy, dll.) */}
        <div className="space-y-2 pt-2 border-t border-border-hairline">
          <div className="flex items-center justify-between">
            <label className="block text-body-sm font-semibold text-text-primary">
              Link Tambahan Lainnya ({customLinks.length})
            </label>
            <span className="text-caption text-text-tertiary">
              Explorer, Galxe, Zealy, Guild, dsb.
            </span>
          </div>

          {customLinks.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {customLinks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md bg-bg-elevated-2 border border-border-hairline text-body-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-medium text-text-primary shrink-0">
                      {item.label}:
                    </span>
                    <span className="text-caption text-link-teal truncate font-mono">
                      {item.url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomLink(idx)}
                    className="text-text-tertiary hover:text-status-overdue shrink-0"
                    title="Hapus Link"
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
              placeholder="Label (cth: Explorer)"
              className="w-full sm:w-1/3 bg-bg-elevated-2 text-text-primary text-body-sm px-3 py-1.5 rounded-md border border-border-hairline focus:outline-none focus:border-accent"
              disabled={isSaving || isDeleting}
            />
            <input
              type="url"
              value={newCustomUrl}
              onChange={(e) => setNewCustomUrl(e.target.value)}
              placeholder="https://..."
              className="w-full sm:flex-1 bg-bg-elevated-2 text-text-primary text-body-sm px-3 py-1.5 rounded-md border border-border-hairline focus:outline-none focus:border-accent"
              disabled={isSaving || isDeleting}
            />
            <ButtonSecondary
              type="button"
              onClick={handleAddCustomLink}
              className="!py-1.5 !px-3 shrink-0 inline-flex items-center justify-center gap-1 text-caption"
              disabled={isSaving || isDeleting}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </ButtonSecondary>
          </div>
        </div>

        {/* Section 5: Panduan Kerja (Guide Content) */}
        <div className="pt-2 border-t border-border-hairline">
          <label className="block text-body-sm font-semibold text-text-primary mb-1">
            Panduan Kerja & Catatan
          </label>
          <textarea
            rows={4}
            value={guideContent}
            onChange={(e) => setGuideContent(e.target.value)}
            placeholder="Panduan kerja, URL faucet penting, catatan gas fee, step by step..."
            className="w-full bg-bg-elevated-2 text-text-primary text-body-sm p-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent font-sans"
            disabled={isSaving || isDeleting}
          />
          <p className="text-caption text-text-tertiary mt-0.5">
            URL otomatis menjadi link clickable saat dilihat di halaman detail proyek.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border-hairline">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-caption text-status-overdue font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Yakin hapus proyek ini?
                </span>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-2.5 py-1 bg-status-overdue text-white text-caption font-semibold rounded hover:bg-red-700 transition-colors"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-caption text-text-secondary hover:text-text-primary underline px-1"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-caption text-status-overdue hover:underline inline-flex items-center gap-1"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Proyek</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <ButtonSecondary
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Batal
            </ButtonSecondary>
            <ButtonPrimary
              type="submit"
              disabled={isSaving || isDeleting}
            >
              {isSaving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
            </ButtonPrimary>
          </div>
        </div>
      </form>
    </Modal>
  );
}
