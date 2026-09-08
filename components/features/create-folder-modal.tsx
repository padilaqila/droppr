"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: (folder: { id: string; name: string }) => void;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onFolderCreated,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama folder tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesi login berakhir. Silakan login kembali.");
        setLoading(false);
        return;
      }

      const { data, error: insertError } = await (supabase as any)
        .from("folders")
        .insert({
          user_id: user.id,
          name: name.trim(),
        })
        .select("id, name")
        .single();

      if (insertError) {
        throw insertError;
      }

      setName("");
      if (onFolderCreated && data) {
        onFolderCreated(data);
      }
      onClose();
    } catch (err: any) {
      console.error("Create folder error:", err);
      setError(err?.message || "Gagal membuat folder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Folder Baru"
      description="Kelompokkan project airdrop berdasarkan kategori atau ekosistem."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
            {error}
          </div>
        )}

        <div>
          <label className="block text-body-sm font-medium text-text-secondary mb-1.5">
            Nama Folder
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Berachain, Solana Ecosystem, Testnet 2026"
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
          <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
            Batal
          </ButtonSecondary>
          <ButtonPrimary type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Buat Folder"}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
