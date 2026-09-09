"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  onConfirm: () => Promise<void>;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  count,
  onConfirm,
}: BulkDeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Proyek Terpilih"
      description={`Anda akan menghapus ${count} proyek yang dipilih secara permanen.`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-status-overdue/10 border border-status-overdue/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-overdue shrink-0 mt-0.5" />
          <div className="text-body-sm text-text-secondary leading-relaxed space-y-1">
            <p className="font-semibold text-text-primary">
              Peringatan: Tindakan ini tidak dapat dibatalkan!
            </p>
            <p>
              Semua data linimasa, catatan pembaruan, dan tugas yang terhubung dengan{" "}
              <strong className="text-status-overdue font-mono">{count} proyek</strong> ini akan ikut dihapus secara permanen dari database.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <ButtonSecondary
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-caption font-semibold"
          >
            Batal
          </ButtonSecondary>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-status-overdue text-white hover:bg-status-overdue/90 text-caption font-semibold transition-all shadow-md shadow-status-overdue/20 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? "Menghapus..." : `Ya, Hapus ${count} Proyek`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
