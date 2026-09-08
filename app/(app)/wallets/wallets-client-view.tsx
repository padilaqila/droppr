"use client";

import React, { useState } from "react";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, Wallet, Plus, Copy, Check, Trash2, FolderGit2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Database } from "@/lib/supabase/database.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

interface WalletWithProjects extends WalletRow {
  projects?: { id: string; name: string }[];
}

export function WalletsClientView({
  initialWallets,
}: {
  initialWallets: WalletWithProjects[];
}) {
  const [wallets, setWallets] = useState<WalletWithProjects[]>(initialWallets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [chain, setChain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Wagmi connection
  const { address: connectedAddress, isConnected, chain: connectedChain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImportConnectedWallet = () => {
    if (!connectedAddress) return;
    setAddress(connectedAddress);
    setLabel(`Wallet Terkoneksi (${connectedChain?.name || "EVM"})`);
    setChain(connectedChain?.name || "EVM");
    setIsModalOpen(true);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError("Alamat wallet wajib diisi.");
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

      const { data, error: insertError } = await supabase
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

      setWallets([data, ...wallets]);
      setAddress("");
      setLabel("");
      setChain("");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to insert wallet:", err);
      setError(err?.message || "Gagal menyimpan wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!confirm("Hapus wallet ini dari daftar?")) return;
    try {
      const supabase = createClient() as any;
      await supabase.from("wallets").delete().eq("id", id);
      setWallets(wallets.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Delete wallet error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            Wallets & Accounts
          </h1>
          <p className="text-body-sm text-text-secondary">
            Kelola alamat wallet publik untuk keperluan multi-akun dan tracking airdrop agar tidak tertukar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && connectedAddress ? (
            <ButtonSecondary
              onClick={handleImportConnectedWallet}
              className="inline-flex items-center gap-2"
            >
              <Link2 className="w-4 h-4 text-accent" />
              <span>Simpan Wallet Terkoneksi</span>
            </ButtonSecondary>
          ) : (
            <ButtonSecondary
              onClick={() => connect({ connector: injected() })}
              disabled={isConnecting}
              className="inline-flex items-center gap-2"
            >
              <Wallet className="w-4 h-4 text-accent" />
              <span>{isConnecting ? "Menghubungkan..." : "Hubungkan Browser Wallet"}</span>
            </ButtonSecondary>
          )}

          <ButtonPrimary
            onClick={() => {
              setAddress("");
              setLabel("");
              setChain("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-on-accent" />
            <span>Tambah Wallet Manual</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Mandatory Security Banner */}
      <div className="p-4 rounded-lg bg-bg-elevated border border-border-hairline flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-status-completed shrink-0 mt-0.5" />
        <div className="text-body-sm">
          <span className="font-semibold text-text-primary">
            Keamanan Terjamin:
          </span>{" "}
          <span className="text-text-secondary">
            Droppr bersifat read-only dan tidak pernah meminta atau menyimpan private key maupun seed phrase.
          </span>
        </div>
      </div>

      {wallets.length === 0 ? (
        <CardBase className="text-center py-12 space-y-3">
          <Wallet className="w-8 h-8 text-text-tertiary mx-auto mb-1" />
          <h3 className="text-heading-3 font-semibold text-text-primary">
            Belum ada wallet tersimpan
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            Simpan alamat wallet yang kamu pakai untuk hunting airdrop agar mudah disalin dan dipasangkan ke project.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {isConnected && connectedAddress && (
              <ButtonSecondary
                onClick={handleImportConnectedWallet}
                className="inline-flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4 text-accent" />
                <span>Simpan Wallet Terkoneksi ({connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)})</span>
              </ButtonSecondary>
            )}
            <ButtonPrimary
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-on-accent" />
              <span>Tambah Wallet Pertama</span>
            </ButtonPrimary>
          </div>
        </CardBase>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((w) => {
            const isCopied = copiedId === w.id;
            const projectCount = w.projects ? w.projects.length : 0;

            return (
              <CardBase
                key={w.id}
                className="space-y-3 hover:border-border-hairline-strong transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-body-md font-semibold text-text-primary">
                        {w.label || "Wallet Tanpa Label"}
                      </h3>
                      {w.chain && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline font-mono text-text-tertiary uppercase">
                          {w.chain}
                        </span>
                      )}
                    </div>
                    <div className="text-caption font-mono text-text-secondary mt-1 break-all">
                      {w.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(w.id, w.address)}
                      className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-text-primary transition-colors"
                      title="Salin Address"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-status-completed" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWallet(w.id)}
                      className="p-1.5 rounded hover:bg-bg-elevated-2 text-text-tertiary hover:text-status-overdue transition-colors"
                      title="Hapus Wallet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assigned Projects Badge */}
                <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-caption text-text-tertiary">
                  <div className="flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>
                      {projectCount > 0
                        ? `Digunakan di ${projectCount} project`
                        : "Belum dipasangkan ke project"}
                    </span>
                  </div>
                </div>
              </CardBase>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Wallet */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Alamat Wallet"
        description="Simpan address publik wallet Anda untuk dipasangkan ke tugas airdrop."
        maxWidth="md"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {error}
            </div>
          )}

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Label / Nama Wallet <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Akun Utama EVM, Wallet Tuyul 01, Backpack Solana"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Alamat Publik (Address) <span className="text-status-overdue">*</span>
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... atau address Solana/Sui/Cosmos"
              className="font-mono text-data-mono-sm"
              required
              disabled={loading}
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              Droppr strictly read-only. Jangan pernah memasukkan private key/seed phrase.
            </p>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1">
              Chain / Jaringan (Opsional)
            </label>
            <Input
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              placeholder="Contoh: EVM, Solana, Sui, Berachain"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
            <ButtonSecondary
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Batal
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Wallet"}
            </ButtonPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
