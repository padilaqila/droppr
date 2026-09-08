"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, Globe, Send, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProjectStatus = Database["public"]["Enums"]["project_status"];

interface FolderOption {
  id: string;
  name: string;
}

interface ParsedTask {
  title: string;
  type: "one_time" | "daily" | "weekly" | "custom";
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
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

  // AI Paste States
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [folderId, setFolderId] = useState<string>(initialFolderId || "");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [guideContent, setGuideContent] = useState("");
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Metadata & Folders
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const supabase = createClient() as any;
      supabase
        .from("folders")
        .select("id, name")
        .order("name")
        .then(({ data }: any) => {
          if (data) setFolders(data);
        });
      if (initialFolderId) {
        setFolderId(initialFolderId);
      }
    }
  }, [isOpen, initialFolderId]);

  const handleAiExtract = async () => {
    if (!rawText.trim()) {
      setAiError("Paste teks pesan airdrop terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/parse-airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memproses dengan AI.");
      }

      const data = json.data;

      // Fill in extracted form values
      if (data.name) setName(data.name);
      if (data.chain) setChain(data.chain);
      if (data.status) setStatus(data.status);
      if (data.social_links?.website) setWebsite(data.social_links.website);
      if (data.social_links?.twitter) setTwitter(data.social_links.twitter);
      if (data.social_links?.telegram) setTelegram(data.social_links.telegram);
      if (data.social_links?.discord) setDiscord(data.social_links.discord);
      if (data.guide_content) setGuideContent(data.guide_content);
      if (Array.isArray(data.tasks)) {
        setTasks(
          data.tasks.map((t: any) => ({
            title: t.title || "Task",
            type: t.type || "one_time",
          }))
        );
      }

      // Switch to review & save mode
      setActiveTab("manual");
    } catch (err: any) {
      console.error("AI parse client error:", err);
      setAiError(err?.message || "Terjadi kesalahan saat memanggil AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { title: newTaskTitle.trim(), type: "one_time" }]);
    setNewTaskTitle("");
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError("Nama project wajib diisi.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveError("Sesi login berakhir. Silakan login kembali.");
        setIsSaving(false);
        return;
      }

      const social_links: Record<string, string> = {};
      if (website.trim()) social_links.website = website.trim();
      if (twitter.trim()) social_links.twitter = twitter.trim();
      if (telegram.trim()) social_links.telegram = telegram.trim();
      if (discord.trim()) social_links.discord = discord.trim();

      // 1. Insert Project
      const { data: projectData, error: projError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          folder_id: folderId || null,
          name: name.trim(),
          chain: chain.trim() || null,
          status: status,
          social_links,
          guide_content: guideContent.trim() || null,
        })
        .select("id, name")
        .single();

      if (projError) throw projError;

      // 2. Insert Tasks if any
      if (tasks.length > 0 && projectData?.id) {
        const taskRows = tasks.map((t) => ({
          project_id: projectData.id,
          title: t.title,
          type: t.type,
          status: "pending" as const,
        }));

        const { error: tasksError } = await supabase
          .from("tasks")
          .insert(taskRows);

        if (tasksError) {
          console.error("Error inserting tasks:", tasksError);
        }
      }

      // Reset
      setName("");
      setChain("");
      setRawText("");
      setTasks([]);
      setGuideContent("");
      setWebsite("");
      setTwitter("");
      setTelegram("");
      setDiscord("");

      if (onProjectCreated && projectData) {
        onProjectCreated(projectData);
      }

      onClose();
    } catch (err: any) {
      console.error("Save project error:", err);
      setSaveError(err?.message || "Gagal menyimpan project.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Project Airdrop"
      description="Ekstrak postingan airdrop otomatis dengan AI atau isi secara manual."
      maxWidth="xl"
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-border-hairline mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2.5 text-body-sm font-semibold border-b-2 transition-colors ${
            activeTab === "ai"
              ? "border-accent text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Smart Paste</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2.5 text-body-sm font-semibold border-b-2 transition-colors ${
            activeTab === "manual"
              ? "border-accent text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <span>Manual Input</span>
        </button>
      </div>

      {/* TAB 1: AI SMART PASTE */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          {aiError && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {aiError}
            </div>
          )}

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
              Paste Pesan / Postingan Airdrop (Telegram, Discord, Twitter, dll.)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Contoh:&#10;• TESTNET AURA •&#10;Aura, Building the future of robotics.&#10;Cost: Gratis&#10;&#10;JOIN TESTNET:&#10;- https://beta.auralaunch.org/&#10;- Hubungkan wallet&#10;- Menu 'Incentive'&#10;- Hubungkan sosmed&#10;- Mint faucet&#10;- Menu 'Stake & Yield'..."
              className="w-full bg-bg-elevated-2 text-text-primary text-body-sm p-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent font-mono transition-colors"
              disabled={isAnalyzing}
            />
            <p className="text-caption text-text-tertiary mt-1">
              AI akan otomatis mengekstrak Nama Project, Chain, URL resmi, Panduan, dan memecah langkah-langkah menjadi Daftar Task.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
            <ButtonSecondary type="button" onClick={onClose} disabled={isAnalyzing}>
              Batal
            </ButtonSecondary>
            <ButtonPrimary
              type="button"
              onClick={handleAiExtract}
              disabled={isAnalyzing || !rawText.trim()}
              className="inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? "Menganalisis dengan AI..." : "Ekstrak dengan AI"}</span>
            </ButtonPrimary>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL / REVIEW FORM */}
      {activeTab === "manual" && (
        <form onSubmit={handleSaveProject} className="space-y-4">
          {saveError && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {saveError}
            </div>
          )}

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
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-body-sm font-medium text-text-secondary mb-1">
                Chain / Jaringan
              </label>
              <Input
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                placeholder="Contoh: Aura Testnet, Arbitrum, Solana"
                disabled={isSaving}
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
                disabled={isSaving}
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
                className="w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                disabled={isSaving}
              >
                <option value="not_started">Belum Mulai</option>
                <option value="in_progress">Sedang Dikerjakan</option>
                <option value="waiting">Menunggu TGE / Snapshot</option>
                <option value="ready_to_claim">Siap Klaim</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-2">
            <label className="block text-body-sm font-medium text-text-secondary">
              Link Terkait
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Globe className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Website / App URL"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving}
                />
              </div>
              <div className="relative">
                <span className="text-body-sm font-bold text-text-tertiary absolute left-3 top-2 pointer-events-none">
                  𝕏
                </span>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="Twitter / X URL atau @handle"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving}
                />
              </div>
              <div className="relative">
                <Send className="w-4 h-4 text-text-tertiary absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="Telegram URL / Channel"
                  className="w-full bg-bg-elevated-2 text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Guide Content */}
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Panduan / Catatan Ringkas
            </label>
            <textarea
              rows={3}
              value={guideContent}
              onChange={(e) => setGuideContent(e.target.value)}
              placeholder="Catatan pengerjaan, info faucet, batas snapshot, dll."
              className="w-full bg-bg-elevated-2 text-text-primary text-body-sm p-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
              disabled={isSaving}
            />
          </div>

          {/* Tasks Checklist */}
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
              Checklist Task Awal ({tasks.length})
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md bg-bg-elevated-2 border border-border-hairline text-body-sm"
                >
                  <span className="text-text-primary">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-mono text-text-tertiary uppercase">
                      {task.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-text-tertiary hover:text-status-overdue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="Tambah task baru... (Tekan Enter)"
                className="flex-1 bg-bg-elevated-2 text-text-primary text-body-sm px-3 py-1.5 rounded-md border border-border-hairline focus:outline-none focus:border-accent"
                disabled={isSaving}
              />
              <ButtonSecondary
                type="button"
                onClick={handleAddTask}
                className="!py-1.5 !px-3"
                disabled={isSaving}
              >
                <Plus className="w-4 h-4" />
              </ButtonSecondary>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary type="button" onClick={onClose} disabled={isSaving}>
              Batal
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={isSaving}>
              {isSaving ? "Menyimpan Project..." : "Simpan Project"}
            </ButtonPrimary>
          </div>
        </form>
      )}
    </Modal>
  );
}
