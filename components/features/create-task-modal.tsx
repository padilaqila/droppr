"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/select";
import { CheckSquare, Clock, Repeat, Sliders } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

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
  const { isEn } = useTranslation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("one_time");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(isEn ? "Task title cannot be empty." : "Judul task tidak boleh kosong.");
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
      setError(err?.message || (isEn ? "Failed to create task." : "Gagal membuat task."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Add New Task" : "Tambah Task Baru"}
      description={isEn ? "Add a task checklist for this project." : "Tambahkan checklist tugas untuk project ini."}
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
            {isEn ? "Task Title" : "Judul Task"}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isEn ? "e.g. Mint daily faucet, Swap 5 testnet tokens" : "Contoh: Mint daily faucet, Swap 5 testnet token"}
            autoFocus
            disabled={loading}
          />
        </div>

        <div>
          <CustomSelect
            label={isEn ? "Task Frequency" : "Frekuensi Task"}
            value={type}
            onChange={(val) => setType(val as TaskType)}
            disabled={loading}
            options={[
              { value: "one_time", label: isEn ? "One-time" : "Sekali Saja", icon: <CheckSquare className="w-3.5 h-3.5 text-status-completed" /> },
              { value: "daily", label: isEn ? "Daily" : "Harian", icon: <Clock className="w-3.5 h-3.5 text-accent" /> },
              { value: "weekly", label: isEn ? "Weekly" : "Mingguan", icon: <Repeat className="w-3.5 h-3.5 text-link-teal" /> },
              { value: "custom", label: isEn ? "Custom" : "Kustom", icon: <Sliders className="w-3.5 h-3.5 text-text-tertiary" /> },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
          <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
            {isEn ? "Cancel" : "Batal"}
          </ButtonSecondary>
          <ButtonPrimary type="submit" disabled={loading}>
            {loading
              ? (isEn ? "Saving..." : "Menyimpan...")
              : (isEn ? "Add Task" : "Tambah Task")}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
