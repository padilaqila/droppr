import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { Plus, FolderGit2, ChevronRight } from "lucide-react";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: rawProjects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projectList = (rawProjects as Project[]) || [];

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

      {projectList.length === 0 ? (
        <CardBase className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-lg bg-bg-elevated-2 border border-border-hairline flex items-center justify-center mx-auto text-text-tertiary">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h3 className="text-heading-3 font-semibold text-text-primary">
            Belum ada project airdrop
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            Mulai catat dan pantau tugas airdropmu dengan menambahkan project pertamamu sekarang.
          </p>
          <div className="pt-2">
            <ButtonPrimary className="inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Tambah Project Pertama</span>
            </ButtonPrimary>
          </div>
        </CardBase>
      ) : (
        <div className="space-y-3">
          {projectList.map((proj) => {
            // Map status DB to UI StatusBadge status
            const badgeStatus = (proj.status.replace("_", "-") as ProjectStatus);

            return (
              <CardBase
                key={proj.id}
                className="hover:border-border-hairline-strong transition-colors"
              >
                <Link
                  href={`/projects/${proj.id}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-bg-elevated-2 flex items-center justify-center border border-border-hairline text-accent">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-body-md font-semibold text-text-primary">
                        {proj.name}
                      </div>
                      <div className="text-caption text-text-tertiary font-mono">
                        {proj.chain ? `Chain: ${proj.chain}` : "No chain specified"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={badgeStatus} />
                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                  </div>
                </Link>
              </CardBase>
            );
          })}
        </div>
      )}
    </div>
  );
}
