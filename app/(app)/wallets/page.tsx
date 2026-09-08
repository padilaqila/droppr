import { CardBase } from "@/components/ui/card";
import { ButtonSecondary } from "@/components/ui/button";
import { ShieldCheck, Wallet, Plus } from "lucide-react";

export default function WalletsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            Wallets & Accounts
          </h1>
          <p className="text-body-sm text-text-secondary">
            Kelola alamat wallet publik untuk keperluan multi-akun dan tracking tugas.
          </p>
        </div>
        <div>
          <ButtonSecondary className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Connect / Tambah Wallet</span>
          </ButtonSecondary>
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

      <CardBase className="text-center py-12 space-y-2">
        <Wallet className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <h3 className="text-heading-3 font-semibold text-text-primary">
          Belum ada wallet terhubung
        </h3>
        <p className="text-body-sm text-text-secondary max-w-md mx-auto">
          Fitur multi-wallet dan pembacaan saldo on-chain publik belum diimplementasikan.
        </p>
      </CardBase>
    </div>
  );
}
