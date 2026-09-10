"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonSecondary } from "@/components/ui/button";
import {
  Send,
  Search,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Info,
} from "lucide-react";
import type { TelegramUpdateItem } from "@/app/api/telegram/search/route";
import {
  createProjectThread,
  deleteProjectThread,
  fetchProjectThreads,
  type ThreadItem,
} from "@/lib/supabase/thread-updates";
import { useTranslation } from "@/lib/i18n/context";
import { cleanDuplicateLinks } from "@/lib/utils/clean-links";
import { normalizeTgUrl, arePostsSimilar } from "@/lib/supabase/telegram-batch-scanner";

interface TelegramUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId?: string;
  telegramPostUrl?: string;
  existingThreads?: ThreadItem[];
  onThreadAdded?: () => void;
  onThreadDeleted?: (threadId: string) => void;
}

const CHANNELS = [
  {
    id: "airdropfind",
    name: "Airdrop Finder",
    handle: "@airdropfind",
    descId: "Update airdrop & testnet global",
    descEn: "Global airdrop & testnet updates",
  },
  {
    id: "dutacryptoairdrop",
    name: "Duta Crypto",
    handle: "@dutacryptoairdrop",
    descId: "Update airdrop & analisa harian",
    descEn: "Daily airdrop updates & analysis",
  },
];

export function TelegramUpdateModal({
  isOpen,
  onClose,
  projectName,
  projectId,
  telegramPostUrl,
  existingThreads = [],
  onThreadAdded,
  onThreadDeleted,
}: TelegramUpdateModalProps) {
  const { isEn } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(projectName);
  // Default to single channel: user can pick ONE channel at a time
  const [selectedChannel, setSelectedChannel] = useState<"airdropfind" | "dutacryptoairdrop">("dutacryptoairdrop");
  const [updates, setUpdates] = useState<TelegramUpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active threads state synchronized with props and real-time database fetch
  const [activeThreads, setActiveThreads] = useState<ThreadItem[]>(existingThreads);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Synchronize when existingThreads prop updates
  useEffect(() => {
    setActiveThreads(existingThreads);
  }, [existingThreads]);

  // When modal is opened, fetch fresh threads from database for projectId to eliminate any stale state
  const refreshActiveThreads = useCallback(async () => {
    if (!projectId) return;
    try {
      const fresh = await fetchProjectThreads(projectId);
      setActiveThreads(fresh);
    } catch (err) {
      console.error("Failed to refresh active threads:", err);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      refreshActiveThreads();
    }
  }, [isOpen, projectId, refreshActiveThreads]);

  // Check if an item is already in the project thread by exact/normalized source_url OR text similarity
  const getThreadItemForPost = useCallback(
    (postUrl: string, postText?: string) => {
      if (!activeThreads || activeThreads.length === 0 || !postUrl) return null;
      const cleanTarget = postUrl.toLowerCase().trim();
      const normTarget = normalizeTgUrl(postUrl);

      return (
        activeThreads.find((th) => {
          // 1. Direct or normalized source_url match
          if (th.source_url) {
            const cleanSource = th.source_url.toLowerCase().trim();
            if (cleanSource === cleanTarget) return true;
            const normSource = normalizeTgUrl(th.source_url);
            if (normTarget && normSource && normTarget === normSource) return true;
          }
          // 2. High text similarity match (deduplication safeguard)
          if (postText && th.content && arePostsSimilar(postText, th.content)) {
            return true;
          }
          return false;
        }) || null
      );
    },
    [activeThreads]
  );

  // Fetch updates from single channel
  const fetchChannelUpdates = useCallback(
    async (query: string, channel: "airdropfind" | "dutacryptoairdrop") => {
      if (!query.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/telegram/search?q=${encodeURIComponent(query.trim())}&channel=${channel}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Gagal mengambil update Telegram.");
        }

        setUpdates(data.updates || []);
      } catch (err: any) {
        console.error("Fetch telegram updates error:", err);
        setError(err?.message || "Terjadi kesalahan saat memuat data.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load when opened or channel changed
  useEffect(() => {
    if (isOpen && projectName) {
      setSearchTerm(projectName);
      fetchChannelUpdates(projectName, selectedChannel);
    }
  }, [isOpen, projectName, selectedChannel, fetchChannelUpdates]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChannelUpdates(searchTerm, selectedChannel);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct 1-Click Save: 100% UNTRUNCATED FULL ORIGINAL POST
  const handleQuickSaveItem = async (item: TelegramUpdateItem) => {
    if (savingItemId || !projectId) return;
    setSavingItemId(item.id);

    try {
      const fullText = item.text.trim();
      const lines = fullText.split("\n").filter((l) => l.trim().length > 0);
      const title = lines[0]?.slice(0, 120) || `Update: ${projectName}`;

      const created = await createProjectThread(projectId, {
        project_id: projectId,
        type: "news",
        title: title.trim(),
        content: fullText, // Full original post, no 400 char truncation!
        source_url: item.postUrl,
        source_date: item.date, // Actual timestamp of the Telegram post
        status: "info",
        completed_at: null,
      });

      setActiveThreads((prev) => [created, ...prev]);
      if (onThreadAdded) onThreadAdded();
    } catch (err) {
      console.error("Failed to add to thread:", err);
    } finally {
      setSavingItemId(null);
    }
  };

  // Direct 1-Click Delete from inside the modal
  const handleRemoveFromThread = async (postUrl: string, postText?: string) => {
    const threadItem = getThreadItemForPost(postUrl, postText);
    if (!threadItem || !projectId || deletingItemId) return;

    setDeletingItemId(postUrl);
    try {
      await deleteProjectThread(projectId, threadItem.id);
      setActiveThreads((prev) => prev.filter((t) => t.id !== threadItem.id));
      if (onThreadDeleted) {
        onThreadDeleted(threadItem.id);
      } else if (onThreadAdded) {
        onThreadAdded();
      }
    } catch (err) {
      console.error("Failed to delete thread item from modal:", err);
    } finally {
      setDeletingItemId(null);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(isEn ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Telegram Airdrop Updates" : "Update Telegram Airdrop"}
      description={
        isEn
          ? "Fetch project updates from selected Telegram channels and add them to the project thread."
          : "Ambil update proyek dari channel Telegram pilihan, lalu masukkan ke thread riwayat proyek."
      }
      maxWidth="xl"
    >
      <div className="space-y-4 max-h-[78vh] flex flex-col">
        {/* Telegram Root Post Banner if available */}
        {telegramPostUrl && (
          <div className="p-2.5 rounded-lg bg-link-teal/10 border border-link-teal/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Send className="w-3.5 h-3.5 text-link-teal shrink-0" />
              <span className="text-caption text-text-primary truncate">
                {isEn ? "Registered Parent Post: " : "Postingan Induk Terdaftar: "}
                <strong className="font-mono text-[11px] text-link-teal">
                  {telegramPostUrl}
                </strong>
              </span>
            </div>
            <a
              href={telegramPostUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-caption text-link-teal hover:underline font-semibold shrink-0"
            >
              <span>{isEn ? "Open in TG" : "Buka di TG"}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}

        {/* SINGLE CHANNEL SELECTOR (User picks ONE channel only) */}
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-text-primary">
              {isEn ? "Select Channel Source (1 Channel):" : "Pilih Sumber Channel (1 Channel):"}
            </span>
            <span className="text-[11px] text-text-tertiary">
              {isEn
                ? "Search is focused on 1 channel for accurate context"
                : "Pencarian fokus pada 1 channel agar konteks akurat"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHANNELS.map((ch) => {
              const isSelected = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    if (selectedChannel !== ch.id) {
                      setSelectedChannel(ch.id as any);
                    }
                  }}
                  className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-accent/15 border-accent text-text-primary ring-1 ring-accent/30 shadow-sm"
                      : "bg-bg-elevated-2/70 border-border-hairline hover:border-border-hairline-strong text-text-secondary"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Send className={`w-3.5 h-3.5 ${isSelected ? "text-accent" : "text-text-tertiary"}`} />
                      <span className="text-body-sm font-semibold truncate">
                        {ch.name}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-text-tertiary mt-0.5">
                      {ch.handle}
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border-hairline bg-bg-elevated"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH BAR (Clean, without AI button) */}
        <div className="flex items-center gap-2 shrink-0">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isEn
                    ? "Search project keywords on Telegram..."
                    : "Cari kata kunci nama proyek di Telegram..."
                }
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg-elevated border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </div>
            <ButtonSecondary
              type="submit"
              disabled={loading}
              className="!py-1.5 !px-3.5 text-caption shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                isEn ? "Search" : "Cari"
              )}
            </ButtonSecondary>
          </form>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption shrink-0">
            {error}
          </div>
        )}

        {/* CONTENT CONTAINER: REAL TELEGRAM POSTS */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-accent mx-auto" />
              <p className="text-body-sm text-text-secondary">
                {isEn
                  ? `Scanning posts from ${CHANNELS.find((c) => c.id === selectedChannel)?.name}...`
                  : `Memindai postingan dari ${CHANNELS.find((c) => c.id === selectedChannel)?.name}...`}
              </p>
            </div>
          ) : updates.length === 0 ? (
            <div className="py-16 text-center space-y-2 p-6 rounded-lg bg-bg-elevated/40 border border-dashed border-border-hairline">
              <Info className="w-8 h-8 text-text-tertiary mx-auto" />
              <p className="text-body-sm text-text-secondary font-medium">
                {isEn
                  ? `No posts found matching "${searchTerm}" in channel ${CHANNELS.find((c) => c.id === selectedChannel)?.name}.`
                  : `Tidak ditemukan postingan terkait "${searchTerm}" di channel ${CHANNELS.find((c) => c.id === selectedChannel)?.name}.`}
              </p>
              <p className="text-caption text-text-tertiary max-w-sm mx-auto">
                {isEn
                  ? "Try changing search keywords or switch to another channel above."
                  : "Coba ubah kata kunci pencarian atau beralih ke channel lainnya di atas."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-text-tertiary px-1">
                <span>
                  {isEn
                    ? `Found ${updates.length} posts in ${CHANNELS.find((c) => c.id === selectedChannel)?.name}`
                    : `Ditemukan ${updates.length} postingan di ${CHANNELS.find((c) => c.id === selectedChannel)?.name}`}
                </span>
                <span>{isEn ? "Order: Newest to Oldest" : "Urutan: Terbaru ke Terlama"}</span>
              </div>

              {updates.map((item) => {
                const threadItem = getThreadItemForPost(item.postUrl, item.text);
                const isAlreadyIn = Boolean(threadItem);
                const isSavingThis = savingItemId === item.id;
                const isDeletingThis = deletingItemId === item.postUrl;
                const isCopied = copiedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isAlreadyIn
                        ? "bg-emerald-500/[0.03] border-emerald-500/35 ring-1 ring-emerald-500/15"
                        : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong"
                    }`}
                  >
                    {/* Header: Channel, Date & Time, External Link */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-border-subtle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-link-teal" />
                          <span>{item.channelName}</span>
                        </span>

                        {/* Explicit Date and Time badge */}
                        <div className="flex items-center gap-1 text-[11px] font-mono text-text-secondary px-2 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline shadow-xs">
                          <Calendar className="w-3 h-3 text-accent" />
                          <span className="font-semibold">{formatDate(item.date)}</span>
                        </div>

                        {/* Indikator Status Masuk Thread / List */}
                        {isAlreadyIn ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{isEn ? "Already in List" : "Sudah Masuk List"}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.04] text-text-tertiary border border-white/[0.08]">
                            {isEn ? "Not in List Yet" : "Belum Masuk List"}
                          </span>
                        )}

                        {telegramPostUrl && normalizeTgUrl(item.postUrl) === normalizeTgUrl(telegramPostUrl) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-link-teal/15 text-link-teal border border-link-teal/30">
                            {isEn ? "Registered Parent Post" : "Postingan Induk Terdaftar"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, cleanDuplicateLinks(item.text))}
                          className="p-1 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-elevated transition-colors"
                          title={isEn ? "Copy post text" : "Salin teks postingan"}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-status-completed" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <a
                          href={item.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated text-link-teal hover:underline text-caption font-medium border border-border-hairline"
                          title={isEn ? "Open post directly on Telegram" : "Buka postingan langsung di Telegram"}
                        >
                          <span>{isEn ? "Open in TG" : "Buka di TG"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Post Text - Readable full preview */}
                    <p className="text-body-sm text-text-primary leading-relaxed whitespace-pre-line mb-3 font-sans max-h-60 overflow-y-auto p-2.5 rounded-md bg-bg-base/40 border border-border-subtle">
                      {cleanDuplicateLinks(item.text)}
                    </p>

                    {/* Bottom Action: Single Button or Already in Timeline with Remove option */}
                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      {isAlreadyIn ? (
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-caption font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isEn ? "Already in Project List" : "Sudah Dimasukkan ke List"}</span>
                          </div>

                          {projectId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromThread(item.postUrl, item.text)}
                              disabled={isDeletingThis}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-overdue/10 hover:bg-status-overdue/20 text-status-overdue border border-status-overdue/30 transition-all text-caption font-semibold disabled:opacity-50"
                              title={isEn ? "Remove this update from project timeline" : "Hapus pembaruan ini dari linimasa proyek"}
                            >
                              {isDeletingThis ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>{isEn ? "Remove from List" : "Hapus dari List"}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end w-full">
                          <button
                            type="button"
                            onClick={() => handleQuickSaveItem(item)}
                            disabled={Boolean(savingItemId) || !projectId}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-on-accent font-semibold text-caption hover:bg-accent-pressed active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                            title={
                              isEn
                                ? "Add original post to project timeline"
                                : "Tambahkan postingan asli ke linimasa proyek"
                            }
                          >
                            {isSavingThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>{isEn ? "Add to Timeline" : "Tambahkan"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-caption text-text-tertiary shrink-0">
          <span>
            {isEn
              ? "Data is fetched publicly from Telegram Web without any account/token."
              : "Data diambil langsung secara publik dari Telegram Web tanpa akun/token."}
          </span>
          <ButtonSecondary onClick={onClose} className="!py-1 !px-3">
            {isEn ? "Close" : "Tutup"}
          </ButtonSecondary>
        </div>
      </div>
    </Modal>
  );
}
