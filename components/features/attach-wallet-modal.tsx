"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

interface AttachWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  assignedWalletIds: string[];
  onWalletsUpdated?: () => void;
}

export function AttachWalletModal({
  isOpen,
  onClose,
  projectId,
  assignedWalletIds,
  onWalletsUpdated,
}: AttachWalletModalProps) {
  const [activeTab, setActiveTab] = useState<"select" | "new">("select");
  const [userWallets, setUserWallets] = useState<WalletRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedWalletIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Wallet Form States
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [chain, setChain] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(assignedWalletIds);
      fetchUserWallets();
    }
  }, [isOpen, assignedWalletIds]);

  const fetchUserWallets = async () => {
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUserWallets(data);
  };

  const handleToggleSelect = (walletId: string) => {
    setSelectedIds((prev) =>
      prev.includes(walletId)
        ? prev.filter((id) => id !== walletId)
        : [...prev, walletId]
    );
  };

  const handleCreateAndAssignWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError("Alamat wallet (0x... / address) tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesi login berakhir.");
        setLoading(false);
        return;
      }

      // 1. Insert Wallet
      const { data: newWallet, error: insertError } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          address: address.trim(),
          label: label.trim() || null,
          chain: chain.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Link to Project
      if (newWallet?.id) {
        await supabase.from("project_wallets").insert({
          project_id: projectId,
          wallet_id: newWallet.id,
        });
      }

      setAddress("");
      setLabel("");
      setChain("");
      if (onWalletsUpdated) onWalletsUpdated();
      onClose();
    } catch (err: any) {
      console.error("Create wallet error:", err);
      setError(err?.message || "Gagal membuat wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssociations = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient() as any;

      // Delete old associations
      await supabase.from("project_wallets").delete().eq("project_id", projectId);

      // Insert selected associations
      if (selectedIds.length > 0) {
        const rows = selectedIds.map((walletId) => ({
          project_id: projectId,
          wallet_id: walletId,
        }));
        const { error: linkError } = await supabase.from("project_wallets").insert(rows);
        if (linkError) throw linkError;
      }

      if (onWalletsUpdated) onWalletsUpdated();
      onClose();
    } catch (err: any) {
      console.error("Save wallet associations error:", err);
      setError(err?.message || "Gagal memperbarui relasi wallet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Wallet untuk Project Ini"
      description="Tentukan wallet yang dipakai untuk airdrop ini agar riwayat dan alur multi-akun tidak tertukar."
      maxWidth="lg"
    >
      {/* Tabs */}
      <div className="flex border-b border-border-hairline mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("select")}
          className={`flex items-center gap-2 px-4 py-2 text-body-sm font-semibold border-b-2 transition-colors ${
            activeTab === "select"
              ? "border-accent text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Pilih dari Daftar ({userWallets.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`flex items-center gap-2 px-4 py-2 text-body-sm font-semibold border-b-2 transition-colors ${
            activeTab === "new"
              ? "border-accent text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Wallet Baru</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption mb-4">
          {error}
        </div>
      )}

      {/* TAB 1: SELECT EXISTING WALLETS */}
      {activeTab === "select" && (
        <div className="space-y-4">
          {userWallets.length === 0 ? (
            <div className="p-6 text-center text-body-sm text-text-tertiary bg-bg-elevated-2 rounded-md border border-border-hairline">
              Belum ada wallet tersimpan di akun Anda. Tambahkan wallet pertamamu di tab sebelah.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {userWallets.map((w) => {
                const isChecked = selectedIds.includes(w.id);
                return (
                  <div
                    key={w.id}
                    onClick={() => handleToggleSelect(w.id)}
                    className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-bg-elevated-2 border-accent text-text-primary"
                        : "bg-bg-elevated-2/50 border-border-hairline text-text-secondary hover:border-border-hairline-strong"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-text-primary">
                          {w.label || "Wallet Tanpa Label"}
                        </span>
                        {w.chain && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated border border-border-hairline font-mono text-text-tertiary">
                            {w.chain}
                          </span>
                        )}
                      </div>
                      <div className="text-caption font-mono text-text-tertiary mt-0.5 truncate max-w-sm">
                        {w.address}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        isChecked
                          ? "bg-accent border-accent text-on-accent"
                          : "border-border-hairline-strong"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
              Batal
            </ButtonSecondary>
            <ButtonPrimary
              type="button"
              onClick={handleSaveAssociations}
              disabled={loading}
            >
              {loading ? "Menyimpan..." : `Pakai Wallet Terpilih (${selectedIds.length})`}
            </ButtonPrimary>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW WALLET AND LINK */}
      {activeTab === "new" && (
        <form onSubmit={handleCreateAndAssignWallet} className="space-y-4">
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Label / Identitas Wallet <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Main EVM, Akun Tuyul 1, Backpack Solana"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Alamat Publik (Address) <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... atau address public chain lainnya"
              className="font-mono text-data-mono-sm"
              required
              disabled={loading}
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              Hanya masukkan alamat publik. Droppr tidak pernah meminta private key.
            </p>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Chain / Jaringan (Opsional)
            </label>
            <Input
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              placeholder="Contoh: EVM, Solana, Cosmos, Sui"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
              Batal
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan & Pasang ke Project"}
            </ButtonPrimary>
          </div>
        </form>
      )}
    </Modal>
  );
}
