import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Plus, FolderGit2, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            Projects & Folders
          </h1>
          <p className="text-body-sm text-text-secondary">
            Daftar seluruh kategori dan proyek airdrop yang kamu kelola.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonSecondary>Buat Folder</ButtonSecondary>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Project</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Project list mock view */}
      <div className="space-y-3">
        <CardBase className="hover:border-border-hairline-strong transition-colors">
          <Link
            href="/projects/story-protocol"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-bg-elevated-2 flex items-center justify-center border border-border-hairline">
                <FolderGit2 className="w-5 h-5 text-link-teal" />
              </div>
              <div>
                <div className="text-body-md font-semibold text-text-primary">
                  Story Protocol
                </div>
                <div className="text-caption text-text-tertiary font-mono">
                  Iliad Testnet · 3 tasks pending
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status="in-progress" />
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            </div>
          </Link>
        </CardBase>

        <CardBase className="hover:border-border-hairline-strong transition-colors">
          <Link
            href="/projects/berachain-v2"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-bg-elevated-2 flex items-center justify-center border border-border-hairline">
                <FolderGit2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-body-md font-semibold text-text-primary">
                  Berachain V2
                </div>
                <div className="text-caption text-text-tertiary font-mono">
                  Bartio BGT · Snapshot ready
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status="ready-claim" />
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            </div>
          </Link>
        </CardBase>
      </div>
    </div>
  );
}
