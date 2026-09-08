import { CardBase } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ButtonSecondary, ButtonPrimary } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Globe, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke daftar project</span>
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-1 font-semibold text-text-primary capitalize">
              {projectId.replace("-", " ")}
            </h1>
            <StatusBadge status="in-progress" />
          </div>
          <p className="text-body-sm text-text-secondary font-mono mt-1">
            Chain: Ethereum / Arbitrum · Folder: Testnet L2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonSecondary>Edit</ButtonSecondary>
          <ButtonPrimary>Tambah Task</ButtonPrimary>
        </div>
      </div>

      {/* Section 1: Social Links */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Link Sosial & Dokumen
        </h2>
        <div className="flex flex-wrap gap-2 text-body-sm">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
          >
            <Globe className="w-3.5 h-3.5" /> X / Twitter
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
          >
            <Send className="w-3.5 h-3.5" /> Discord
          </a>
          <a
            href="https://example.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Website
          </a>
        </div>
      </CardBase>

      {/* Section 2: Panduan Kerja (Guide) */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Panduan Kerja (Guide)
        </h2>
        <div className="p-4 rounded-md bg-bg-elevated-2 text-body-sm text-text-secondary space-y-2">
          <p>1. Hubungkan wallet ke testnet faucet.</p>
          <p>2. Request faucet token tiap 24 jam.</p>
          <p>3. Lakukan mint testnet IP NFT di portal resmi.</p>
        </div>
      </CardBase>

      {/* Section 3: Task List */}
      <CardBase className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-app-section-title font-semibold text-text-primary">
            Daftar Task
          </h2>
          <ButtonSecondary className="!py-1 !px-2.5 text-caption">
            + Task
          </ButtonSecondary>
        </div>
        <p className="text-body-sm text-text-tertiary">
          (Fitur checklist task dan recurring task belum diimplementasi)
        </p>
      </CardBase>

      {/* Section 4: Wallet Terhubung */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Wallet Terhubung
        </h2>
        <div className="flex items-center justify-between p-3 rounded-md bg-bg-elevated-2 font-mono text-data-mono-sm">
          <span className="text-text-primary">0x71C...49A1</span>
          <span className="text-text-tertiary">Wallet Utama</span>
        </div>
      </CardBase>

      {/* Section 5: Akun Terkait (Non-sensitif) */}
      <CardBase className="space-y-2">
        <div className="flex items-center gap-2 text-caption text-text-tertiary">
          <ShieldAlert className="w-3.5 h-3.5 text-accent" />
          <span>Akun non-sensitif (Droppr tidak pernah menyimpan password)</span>
        </div>
        <div className="p-3 rounded-md bg-bg-elevated-2 text-body-sm">
          <span className="text-text-secondary">Username:</span>{" "}
          <span className="text-text-primary font-mono">@hunter_alpha</span>
        </div>
      </CardBase>
    </div>
  );
}
