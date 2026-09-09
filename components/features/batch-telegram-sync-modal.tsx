"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary } from "@/components/ui/button";
import {
  ExternalLink,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import {
  type BatchTelegramItem,
  saveBatchUpdatesToThreads,
} from "@/lib/supabase/telegram-batch-scanner";
import { useTranslation } from "@/lib/i18n/context";

interface BatchTelegramSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredItems: BatchTelegramItem[];
  onSyncComplete?: (savedCount: number) => void;
}

export function BatchTelegramSyncModal({
  isOpen,
  onClose,
  discoveredItems,
  onSyncComplete,
}: BatchTelegramSyncModalProps) {
  const { isEn } = useTranslation();
  const [items, setItems] = useState<BatchTelegramItem[]>(discoveredItems);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync internal items whenever modal opens or discoveredItems change
  React.useEffect(() => {
    setItems(discoveredItems.map((it) => ({ ...it, selected: true })));
    setErrorMsg(null);
  }, [discoveredItems, isOpen]);

  const toggleItemSelection = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const toggleAll = (select: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  const selectedCount = items.filter((it) => it.selected).length;
  const uniqueProjectsCount = new Set(items.map((it) => it.projectId)).size;

  const handleSaveToThreads = async () => {
    const toSave = items.filter((it) => it.selected);
    if (toSave.length === 0) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const { successCount } = await saveBatchUpdatesToThreads(toSave);
      if (onSyncComplete) {
        onSyncComplete(successCount);
      }
      onClose();
    } catch (err: any) {
      console.error("Batch sync error:", err);
      setErrorMsg(err?.message || (isEn ? "Failed to save updates." : "Gagal menyimpan update ke thread."));
    } finally {
      setIsSaving(false);
    }
  };

  // Group items by project
  const groupedByProject = React.useMemo(() => {
    const map = new Map<string, { projectName: string; items: BatchTelegramItem[] }>();
    for (const it of items) {
      const current = map.get(it.projectId) || { projectName: it.projectName, items: [] };
      current.items.push(it);
      map.set(it.projectId, current);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Telegram Updates Discovered" : "Kabar Terbaru Telegram Ditemukan"}
      description={
        isEn
          ? `Found ${items.length} new update(s) across ${uniqueProjectsCount} project(s). Review and sync to project threads in 1-click.`
          : `Ditemukan ${items.length} kabar baru dari ${uniqueProjectsCount} proyek. Tinjau dan simpan ke linimasa thread dalam 1 klik.`
      }
      maxWidth="3xl"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-border-hairline bg-bg-elevated flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAll(selectedCount < items.length)}
              className="text-caption font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              {selectedCount === items.length ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4 text-text-tertiary" />
              )}
              <span>
                {selectedCount === items.length
                  ? isEn
                    ? "Deselect All"
                    : "Batalkan Semua"
                  : isEn
                  ? "Select All"
                  : "Pilih Semua"}
              </span>
            </button>
            <span className="text-text-tertiary text-caption">•</span>
            <span className="text-caption text-text-secondary font-mono">
              {selectedCount}/{items.length} {isEn ? "selected" : "dipilih"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>{isEn ? "Spam & Duplicate Filtered" : "Anti-Dobel & Spam Tersaring"}</span>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 max-h-[calc(80vh-160px)]">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-body-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {groupedByProject.length === 0 ? (
            <div className="text-center py-10 text-text-tertiary space-y-2">
              <CheckCircle2 className="w-8 h-8 text-status-completed mx-auto opacity-70" />
              <p className="text-body-sm font-medium text-text-primary">
                {isEn ? "All project threads are up to date!" : "Semua linimasa proyek sudah yang terbaru!"}
              </p>
              <p className="text-caption">
                {isEn ? "No new Telegram posts found for active projects." : "Tidak ada postingan Telegram baru yang belum tersimpan."}
              </p>
            </div>
          ) : (
            groupedByProject.map(([projId, group]) => (
              <div
                key={projId}
                className="space-y-2.5 p-4 rounded-xl bg-bg-elevated-2/70 border border-border-hairline"
              >
                {/* Project Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-hairline">
                  <span className="font-bold text-body-sm text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span>{group.projectName}</span>
                  </span>
                  <span className="text-[11px] font-mono text-text-tertiary">
                    {group.items.length} {isEn ? "post(s)" : "kabar"}
                  </span>
                </div>

                {/* Items in this project */}
                <div className="space-y-2">
                  {group.items.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => toggleItemSelection(it.id)}
                      className={`p-3 rounded-lg border text-caption transition-all cursor-pointer flex items-start gap-3 select-none ${
                        it.selected
                          ? "bg-bg-elevated border-accent/40 shadow-xs"
                          : "bg-bg-elevated/50 border-border-subtle opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {it.selected ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-text-tertiary" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-text-primary line-clamp-1">
                            {it.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {it.channelName}
                            </span>
                            <a
                              href={it.postUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-text-tertiary hover:text-accent transition-colors"
                              title="Buka postingan di Telegram"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        <p className="text-text-secondary text-[12px] line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                          {it.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
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

          <ButtonPrimary
            type="button"
            onClick={handleSaveToThreads}
            disabled={isSaving || selectedCount === 0}
            className="!py-2 !px-5 text-body-sm font-semibold inline-flex items-center gap-2 shadow-sm"
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>{isEn ? "Syncing..." : "Menyimpan ke Thread..."}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {isEn
                    ? `Save to Threads (${selectedCount})`
                    : `Masukkan ke Thread (${selectedCount})`}
                </span>
              </>
            )}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}
