"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";

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
  const { isEn } = useTranslation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isEn ? "Folder name cannot be empty." : "Nama folder tidak boleh kosong.");
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
        setError(isEn ? "Login session expired. Please log in again." : "Sesi login berakhir. Silakan login kembali.");
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
      setError(err?.message || (isEn ? "Failed to create folder." : "Gagal membuat folder."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Create New Folder" : "Buat Folder Baru"}
      description={isEn ? "Organize airdrop projects by category or ecosystem." : "Kelompokkan project airdrop berdasarkan kategori atau ekosistem."}
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
            {isEn ? "Folder Name" : "Nama Folder"}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isEn ? "e.g. Berachain, Solana Ecosystem, Testnet 2026" : "Contoh: Berachain, Solana Ecosystem, Testnet 2026"}
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
          <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
            {isEn ? "Cancel" : "Batal"}
          </ButtonSecondary>
          <ButtonPrimary type="submit" disabled={loading}>
            {loading
              ? (isEn ? "Saving..." : "Menyimpan...")
              : (isEn ? "Create Folder" : "Buat Folder")}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
