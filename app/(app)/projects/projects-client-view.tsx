"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { FolderGit2, ChevronRight, Sparkles, Folder } from "lucide-react";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import { CreateFolderModal } from "@/components/features/create-folder-modal";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type FolderType = Database["public"]["Tables"]["folders"]["Row"];

interface ProjectsClientViewProps {
  initialProjects: Project[];
  initialFolders: FolderType[];
}

export function ProjectsClientView({
  initialProjects,
  initialFolders,
}: ProjectsClientViewProps) {
  const router = useRouter();
  const [projects] = useState<Project[]>(initialProjects);
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);

  const handleFolderCreated = (folder: { id: string; name: string }) => {
    setFolders((prev) => [
      ...prev,
      {
        id: folder.id,
        name: folder.name,
        user_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    router.refresh();
  };

  const handleProjectCreated = () => {
    router.refresh();
  };

  const filteredProjects = selectedFolderFilter
    ? projects.filter((p) => p.folder_id === selectedFolderFilter)
    : projects;

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
          <ButtonSecondary
            onClick={() => setIsFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5"
          >
            <Folder className="w-4 h-4" />
            <span>Buat Folder</span>
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-on-accent" />
            <span>Tambah Project</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Folders Filter Chips (if any exist) */}
      {folders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedFolderFilter(null)}
            className={`px-3 py-1 rounded-full text-caption font-medium transition-colors ${
              selectedFolderFilter === null
                ? "bg-accent text-on-accent"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
            }`}
          >
            Semua Project ({projects.length})
          </button>
          {folders.map((f) => {
            const count = projects.filter((p) => p.folder_id === f.id).length;
            const isSelected = selectedFolderFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderFilter(f.id)}
                className={`px-3 py-1 rounded-full text-caption font-medium transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-accent text-on-accent"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2"
                }`}
              >
                <span>{f.name}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <CardBase className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-lg bg-bg-elevated-2 border border-border-hairline flex items-center justify-center mx-auto text-text-tertiary">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h3 className="text-heading-3 font-semibold text-text-primary">
            {selectedFolderFilter
              ? "Belum ada project di folder ini"
              : "Belum ada project airdrop"}
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            Mulai catat dan pantau tugas airdropmu dengan menambahkan project pertamamu sekarang.
          </p>
          <div className="pt-2">
            <ButtonPrimary
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-on-accent" />
              <span>Tambah Project Pertama</span>
            </ButtonPrimary>
          </div>
        </CardBase>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((proj) => {
            const badgeStatus = (proj.status.replace("_", "-") as ProjectStatus);
            const folder = folders.find((f) => f.id === proj.folder_id);

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
                      <div className="flex items-center gap-2">
                        <span className="text-body-md font-semibold text-text-primary">
                          {proj.name}
                        </span>
                        {folder && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-elevated-2 text-text-secondary">
                            {folder.name}
                          </span>
                        )}
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

      {/* Modals */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onFolderCreated={handleFolderCreated}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        initialFolderId={selectedFolderFilter || undefined}
      />
    </div>
  );
}
