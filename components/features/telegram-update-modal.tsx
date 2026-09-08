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
  Clock,
  Plus,
  CheckSquare,
  Newspaper,
  Sparkles,
  ArrowLeft,
  Info,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { TelegramUpdateItem } from "@/app/api/telegram/search/route";
import {
  createProjectThread,
  bulkCreateProjectThreads,
  type ThreadItem,
} from "@/lib/supabase/thread-updates";

interface ParsedAiItem {
  type: "task" | "news";
  title: string;
  content?: string;
  source_url: string;
  source_date: string;
  selected?: boolean;
}

interface TelegramUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId?: string;
  telegramPostUrl?: string;
  existingThreads?: ThreadItem[];
  onThreadAdded?: () => void;
}

const CHANNELS = [
  {
    id: "airdropfind",
    name: "Airdrop Finder",
    handle: "@airdropfind",
    desc: "Update airdrop & testnet global",
  },
  {
    id: "dutacryptoairdrop",
    name: "Duta Crypto",
    handle: "@dutacryptoairdrop",
    desc: "Update airdrop & analisa harian",
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
}: TelegramUpdateModalProps) {
  const [searchTerm, setSearchTerm] = useState(projectName);
  // Default to single channel: user can pick ONE channel at a time
  const [selectedChannel, setSelectedChannel] = useState<"airdropfind" | "dutacryptoairdrop">("dutacryptoairdrop");
  const [updates, setUpdates] = useState<TelegramUpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick save state
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // AI Parse states
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiItems, setAiItems] = useState<ParsedAiItem[]>([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Check if an item is already in the project thread
  const isPostInThread = useCallback(
    (postUrl: string, textSnippet?: string) => {
      if (!existingThreads || existingThreads.length === 0) return false;
      return existingThreads.some((th) => {
        if (th.source_url && postUrl && th.source_url.toLowerCase() === postUrl.toLowerCase()) {
          return true;
        }
        if (textSnippet && textSnippet.length > 25 && th.title && th.title.toLowerCase().includes(textSnippet.slice(0, 30).toLowerCase())) {
          return true;
        }
        return false;
      });
    },
    [existingThreads]
  );

  // Fetch updates from single channel
  const fetchChannelUpdates = useCallback(
    async (query: string, channel: "airdropfind" | "dutacryptoairdrop") => {
      if (!query.trim()) return;
      setLoading(true);
      setError(null);
      setIsAiMode(false);
      setAiItems([]);

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

  // Direct 1-Click Save from Post Card
  const handleQuickSaveItem = async (
    item: TelegramUpdateItem,
    type: "task" | "news"
  ) => {
    if (savingItemId || !projectId) return;
    setSavingItemId(item.id);

    try {
      const lines = item.text.split("\n").filter((l) => l.trim().length > 0);
      const title = lines[0]?.slice(0, 120) || `Update: ${projectName}`;
      const content = lines.slice(1).join("\n").slice(0, 400);

      await createProjectThread(projectId, {
        project_id: projectId,
        type: type,
        title: title.trim(),
        content: content.trim() || null,
        source_url: item.postUrl,
        source_date: item.date,
        status: type === "task" ? "pending" : "info",
        completed_at: null,
      });

      if (onThreadAdded) onThreadAdded();
    } catch (err) {
      console.error("Failed to add to thread:", err);
    } finally {
      setSavingItemId(null);
    }
  };

  // Trigger AI formatting for the selected channel
  const handleRunAiParsing = async () => {
    if (updates.length === 0 || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    const activeChannelObj = CHANNELS.find((c) => c.id === selectedChannel);

    try {
      const res = await fetch("/api/ai/parse-telegram-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          channelName: activeChannelObj?.name || selectedChannel,
          messages: updates.slice(0, 15), // Send relevant updates
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal merapikan update dengan AI.");
      }

      const items: ParsedAiItem[] = (data.items || []).map((it: any) => ({
        ...it,
        selected: !isPostInThread(it.source_url, it.title), // Pre-select only new ones
      }));

      setAiItems(items);
      setIsAiMode(true);
    } catch (err: any) {
      console.error("AI parse error:", err);
      setAiError(err?.message || "Gagal memproses pesan dengan AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Toggle selection for AI items
  const toggleSelectAiItem = (index: number) => {
    setAiItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Toggle select all
  const toggleSelectAllAiItems = (select: boolean) => {
    setAiItems((prev) =>
      prev.map((item) => {
        const alreadyIn = isPostInThread(item.source_url, item.title);
        return {
          ...item,
          selected: alreadyIn ? false : select,
        };
      })
    );
  };

  // Bulk save selected AI items to thread
  const handleSaveAiItemsToThread = async () => {
    const selected = aiItems.filter((it) => it.selected);
    if (selected.length === 0 || isSavingBulk || !projectId) return;

    setIsSavingBulk(true);
    try {
      const payloads = selected.map((it) => ({
        project_id: projectId,
        type: it.type,
        title: it.title,
        content: it.content || null,
        source_url: it.source_url || null,
        source_date: it.source_date || null,
        status: (it.type === "task" ? "pending" : "info") as "pending" | "info",
        completed_at: null,
      }));

      await bulkCreateProjectThreads(projectId, payloads);

      if (onThreadAdded) onThreadAdded();

      // Update AI items selection
      setAiItems((prev) =>
        prev.map((it) => (it.selected ? { ...it, selected: false } : it))
      );

      // Return back to post list or notify
      setIsAiMode(false);
    } catch (err) {
      console.error("Failed to bulk save AI items to thread:", err);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
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
      title="Update Telegram Airdrop"
      description="Ambil update proyek dari channel Telegram pilihan, lalu masukkan ke thread riwayat proyek."
      maxWidth="xl"
    >
      <div className="space-y-4 max-h-[78vh] flex flex-col">
        {/* Telegram Root Post Banner if available */}
        {telegramPostUrl && (
          <div className="p-2.5 rounded-lg bg-link-teal/10 border border-link-teal/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Send className="w-3.5 h-3.5 text-link-teal shrink-0" />
              <span className="text-caption text-text-primary truncate">
                Postingan Induk Terdaftar:{" "}
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
              <span>Buka di TG</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}

        {/* SINGLE CHANNEL SELECTOR (User picks ONE channel only) */}
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-text-primary">
              Pilih Sumber Channel (1 Channel):
            </span>
            <span className="text-[11px] text-text-tertiary">
              Pencarian fokus pada 1 channel agar konteks akurat
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
                        ? "border-accent bg-accent text-text-inverse"
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

        {/* SEARCH BAR & AI ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kata kunci nama proyek di Telegram..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg-elevated border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </div>
            <ButtonSecondary
              type="submit"
              disabled={loading}
              className="!py-1.5 !px-3 text-caption shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Cari"
              )}
            </ButtonSecondary>
          </form>

          {/* AI ACTION BUTTON */}
          <div className="flex items-center gap-2 shrink-0">
            {isAiMode ? (
              <ButtonSecondary
                type="button"
                onClick={() => setIsAiMode(false)}
                className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lihat Pesan Asli</span>
              </ButtonSecondary>
            ) : (
              <button
                type="button"
                onClick={handleRunAiParsing}
                disabled={loading || aiLoading || updates.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-accent to-accent-hover text-text-inverse font-semibold text-caption shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
                title="AI akan merapikan seluruh pesan dari channel ini dan memisahkan mana Task dan mana Berita secara otomatis"
              >
                {aiLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {aiLoading ? "AI Menganalisis..." : "✨ Rapihkan dengan AI"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ERROR STATE */}
        {(error || aiError) && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption shrink-0">
            {error || aiError}
          </div>
        )}

        {/* CONTENT CONTAINER: MODE 1 (AI PARSED RESULTS) OR MODE 2 (RAW TELEGRAM POSTS) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
          {/* ======================================================== */}
          {/* MODE 1: AI PARSED RESULTS (Task vs News Separation)     */}
          {/* ======================================================== */}
          {isAiMode ? (
            <div className="space-y-4">
              {/* AI Header Banner */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <h4 className="text-body-sm font-semibold text-text-primary">
                      Hasil Analisis AI untuk {projectName}
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      AI berhasil memisahkan {aiItems.filter((i) => i.type === "task").length} Langkah Task dan {aiItems.filter((i) => i.type === "news").length} Catatan Berita.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => toggleSelectAllAiItems(true)}
                    className="text-[11px] text-accent hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-text-tertiary">|</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAllAiItems(false)}
                    className="text-[11px] text-text-tertiary hover:underline"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {aiItems.length === 0 ? (
                <div className="py-10 text-center text-caption text-text-tertiary">
                  Tidak ada poin update baru yang terdeteksi oleh AI.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {aiItems.map((item, index) => {
                    const isAlreadyIn = isPostInThread(item.source_url, item.title);
                    const isTask = item.type === "task";

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          if (!isAlreadyIn) toggleSelectAiItem(index);
                        }}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isAlreadyIn
                            ? "bg-bg-elevated/40 border-border-subtle opacity-70 cursor-not-allowed"
                            : item.selected
                            ? "bg-bg-elevated-2 border-accent ring-1 ring-accent/30"
                            : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <div className="pt-0.5 shrink-0">
                            {isAlreadyIn ? (
                              <CheckCircle2 className="w-4 h-4 text-status-completed" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={Boolean(item.selected)}
                                onChange={() => toggleSelectAiItem(index)}
                                className="w-4 h-4 rounded border-border-hairline text-accent focus:ring-accent accent-accent cursor-pointer"
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                                    isTask
                                      ? "bg-accent/20 text-accent"
                                      : "bg-link-teal/20 text-link-teal"
                                  }`}
                                >
                                  {isTask ? "⚡ Task (Checkbox)" : "📰 Berita / Info"}
                                </span>

                                {item.source_date && (
                                  <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(item.source_date)}</span>
                                  </span>
                                )}
                              </div>

                              {isAlreadyIn ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-status-completed/15 text-status-completed border border-status-completed/30 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Sudah di Thread</span>
                                </span>
                              ) : (
                                item.source_url && (
                                  <a
                                    href={item.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-link-teal hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <span>Sumber TG</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )
                              )}
                            </div>

                            <p className="text-body-sm font-semibold text-text-primary leading-snug">
                              {item.title}
                            </p>

                            {item.content && (
                              <p className="text-caption text-text-secondary line-clamp-2">
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bulk Action Footer */}
              {aiItems.length > 0 && (
                <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline flex items-center justify-between gap-2 shrink-0">
                  <span className="text-caption text-text-secondary">
                    {aiItems.filter((i) => i.selected).length} item terpilih untuk dimasukkan ke thread
                  </span>

                  <button
                    type="button"
                    onClick={handleSaveAiItemsToThread}
                    disabled={isSavingBulk || aiItems.filter((i) => i.selected).length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-text-inverse font-semibold text-body-sm hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSavingBulk ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>
                      {isSavingBulk
                        ? "Menyimpan ke Thread..."
                        : `+ Masukkan ${aiItems.filter((i) => i.selected).length} Item ke Thread`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* MODE 2: RAW TELEGRAM POSTS FROM SELECTED CHANNEL        */
            /* ======================================================== */
            <div>
              {loading ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-accent mx-auto" />
                  <p className="text-body-sm text-text-secondary">
                    Memindai postingan dari {CHANNELS.find((c) => c.id === selectedChannel)?.name}...
                  </p>
                </div>
              ) : updates.length === 0 ? (
                <div className="py-16 text-center space-y-2 p-6 rounded-lg bg-bg-elevated/40 border border-dashed border-border-hairline">
                  <Info className="w-8 h-8 text-text-tertiary mx-auto" />
                  <p className="text-body-sm text-text-secondary font-medium">
                    Tidak ditemukan postingan terkait &quot;{searchTerm}&quot; di channel {CHANNELS.find((c) => c.id === selectedChannel)?.name}.
                  </p>
                  <p className="text-caption text-text-tertiary max-w-sm mx-auto">
                    Coba ubah kata kunci pencarian atau beralih ke channel lainnya di atas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-text-tertiary px-1">
                    <span>
                      Ditemukan {updates.length} postingan di {CHANNELS.find((c) => c.id === selectedChannel)?.name}
                    </span>
                    <span>Urutan: Terbaru ke Terlama</span>
                  </div>

                  {updates.map((item) => {
                    const isAlreadyIn = isPostInThread(item.postUrl, item.text);
                    const isSavingThis = savingItemId === item.id;
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          isAlreadyIn
                            ? "bg-bg-elevated/50 border-status-completed/20"
                            : "bg-bg-elevated border-border-hairline hover:border-border-hairline-strong"
                        }`}
                      >
                        {/* Header: Channel, Date & Time, External Link */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-border-subtle">
                          <div className="flex items-center gap-2">
                            <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5 text-link-teal" />
                              <span>{item.channelName}</span>
                            </span>

                            {/* Explicit Date and Time badge */}
                            <div className="flex items-center gap-1 text-[11px] font-mono text-text-secondary px-2 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline">
                              <Calendar className="w-3 h-3 text-text-tertiary" />
                              <span>{formatDate(item.date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(item.id, item.text)}
                              className="p-1 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-elevated transition-colors"
                              title="Salin teks postingan"
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
                              title="Buka postingan langsung di Telegram"
                            >
                              <span>Buka di TG</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>

                        {/* Post Text */}
                        <p className="text-body-sm text-text-primary leading-relaxed whitespace-pre-line mb-3 line-clamp-6 hover:line-clamp-none transition-all">
                          {item.text}
                        </p>

                        {/* Bottom Actions: Check if already in thread */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                          {isAlreadyIn ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-completed/15 text-status-completed border border-status-completed/30 text-caption font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sudah Ada di Thread Proyek</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-text-tertiary mr-1">
                                Masukkan ke Thread sebagai:
                              </span>

                              {/* Save as Task */}
                              <button
                                type="button"
                                onClick={() => handleQuickSaveItem(item, "task")}
                                disabled={Boolean(savingItemId)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition-colors text-caption font-semibold disabled:opacity-50"
                                title="Masukkan sebagai Task dengan Checkbox"
                              >
                                {isSavingThis ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckSquare className="w-3 h-3" />
                                )}
                                <span>+ Langkah Task</span>
                              </button>

                              {/* Save as News */}
                              <button
                                type="button"
                                onClick={() => handleQuickSaveItem(item, "news")}
                                disabled={Boolean(savingItemId)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-link-teal/15 border border-link-teal/30 text-link-teal hover:bg-link-teal/25 transition-colors text-caption font-semibold disabled:opacity-50"
                                title="Masukkan sebagai Catatan Berita / Update Info tanpa checkbox"
                              >
                                {isSavingThis ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Newspaper className="w-3 h-3" />
                                )}
                                <span>+ Catatan Berita</span>
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
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-caption text-text-tertiary shrink-0">
          <span>Data diambil langsung secara publik dari Telegram Web tanpa akun/token.</span>
          <ButtonSecondary onClick={onClose} className="!py-1 !px-3">
            Tutup
          </ButtonSecondary>
        </div>
      </div>
    </Modal>
  );
}
