"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type TaskType = Database["public"]["Enums"]["task_type"];

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onTaskCreated?: () => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("one_time");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul task tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient() as any;
      const { error: insertError } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: title.trim(),
        type: type,
        status: "pending",
      });

      if (insertError) throw insertError;

      setTitle("");
      setType("one_time");
      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error("Create task error:", err);
      setError(err?.message || "Gagal membuat task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Task Baru"
      description="Tambahkan checklist tugas untuk project ini."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
            {error}
          </div>
        )}

        <div>
          <label className="block text-body-sm font-medium text-text-secondary mb-1">
            Judul Task
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Mint daily faucet, Swap 5 testnet token"
            autoFocus
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-text-secondary mb-1">
            Frekuensi Task
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent"
            disabled={loading}
          >
            <option value="one_time">Sekali Saja (One-time)</option>
            <option value="daily">Harian (Daily)</option>
            <option value="weekly">Mingguan (Weekly)</option>
            <option value="custom">Kustom (Custom)</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
          <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
            Batal
          </ButtonSecondary>
          <ButtonPrimary type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Tambah Task"}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
