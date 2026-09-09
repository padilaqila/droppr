"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  ChevronRight,
  Sparkles,
  Folder,
  FolderPlus,
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  CheckSquare,
  Square,
  Trash2,
  Archive,
  FolderInput,
  GripVertical,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { StatusBadge, type ProjectStatus as BadgeProjectStatus } from "@/components/ui/status-badge";
import { CreateFolderModal } from "@/components/features/create-folder-modal";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import { BulkDeleteModal } from "@/components/features/bulk-delete-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { useTranslation } from "@/lib/i18n/context";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type FolderType = Database["public"]["Tables"]["folders"]["Row"];
type DbProjectStatus = Project["status"];

interface ProjectsClientViewProps {
  initialProjects: Project[];
  initialFolders: FolderType[];
}

export function ProjectsClientView({
  initialProjects,
  initialFolders,
}: ProjectsClientViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);

  // Sync state if server data refreshes
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  // Modals & Navigation
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);

  // Explorer State
  // selectedFolderFilter: null = Semua Proyek, "root" = Tanpa Folder, string (UUID) = Folder ID
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Drag & Drop State
  const [draggingProjectIds, setDraggingProjectIds] = useState<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const notifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: "success" | "info" = "success") => {
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    setNotification({ message, type });
    notifyTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Filtered projects based on active folder & search
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Folder filter
      if (selectedFolderFilter === "root") {
        if (p.folder_id !== null) return false;
      } else if (selectedFolderFilter !== null) {
        if (p.folder_id !== selectedFolderFilter) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchChain = (p.chain || "").toLowerCase().includes(q);
        if (!matchName && !matchChain) return false;
      }

      return true;
    });
  }, [projects, selectedFolderFilter, searchQuery]);

  // Current folder details
  const activeFolder = useMemo(() => {
    if (selectedFolderFilter === null) return { id: null, name: t("projects.allProjects") };
    if (selectedFolderFilter === "root") return { id: "root", name: t("projects.unorganized") };
    const f = folders.find((item) => item.id === selectedFolderFilter);
    return f ? { id: f.id, name: f.name } : { id: null, name: t("projects.allProjects") };
  }, [folders, selectedFolderFilter, t]);

  // Toggle selection for a single project
  const toggleSelectProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  // Select all or deselect all in current view
  const toggleSelectAll = () => {
    if (selectedProjectIds.length === filteredProjects.length && filteredProjects.length > 0) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map((p) => p.id));
    }
  };

  // MOVE PROJECTS TO FOLDER (Optimistic & Smooth)
  const moveProjectsToFolder = async (projectIds: string[], targetFolderId: string | null) => {
    if (projectIds.length === 0) return;

    const count = projectIds.length;
    const targetFolderName =
      targetFolderId === null
        ? "Tanpa Folder (Root)"
        : folders.find((f) => f.id === targetFolderId)?.name || "Folder Baru";

    // 1. Optimistic update local state immediately (0ms lag)
    setProjects((prev) =>
      prev.map((p) => (projectIds.includes(p.id) ? { ...p, folder_id: targetFolderId } : p))
    );

    // Clear selection
    setSelectedProjectIds((prev) => prev.filter((id) => !projectIds.includes(id)));

    showToast(`Berhasil memindahkan ${count} proyek ke "${targetFolderName}"`);

    // 2. Persist to Supabase in background
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          folder_id: targetFolderId,
          updated_at: new Date().toISOString(),
        })
        .in("id", projectIds);

      if (error) throw error;
    } catch (err) {
      console.error("Move projects error:", err);
      showToast("Gagal menyimpan pemindahan folder ke database", "info");
      // Revert if error
      setProjects(initialProjects);
    }
  };

  // NATIVE HTML5 DRAG & DROP HANDLERS (GPU-Accelerated 60 FPS)
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    let idsToDrag = [projectId];
    // If the dragged project is part of multi-selection, drag ALL selected projects
    if (selectedProjectIds.includes(projectId)) {
      idsToDrag = selectedProjectIds;
    }

    setDraggingProjectIds(idsToDrag);
    e.dataTransfer.setData("text/plain", JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingProjectIds([]);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string | null | "root") => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const resolvedId = folderId === "root" ? "root" : folderId;
    if (dragOverFolderId !== resolvedId) {
      setDragOverFolderId(resolvedId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderId: string | null | "root") => {
    e.preventDefault();
    e.stopPropagation();
    const resolvedId = folderId === "root" ? "root" : folderId;
    if (dragOverFolderId === resolvedId) {
      setDragOverFolderId(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string | null | "root") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    let idsToMove = draggingProjectIds;
    try {
      const parsed = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        idsToMove = parsed;
      }
    } catch {
      // fallback to draggingProjectIds state
    }

    if (idsToMove.length === 0) return;

    const targetFolderId = folderId === "root" || folderId === null ? null : folderId;
    moveProjectsToFolder(idsToMove, targetFolderId);
    setDraggingProjectIds([]);
  };

  // BULK ARCHIVE (Move status to 'waiting')
  const handleBulkArchive = async () => {
    if (selectedProjectIds.length === 0) return;
    const count = selectedProjectIds.length;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        selectedProjectIds.includes(p.id)
          ? { ...p, status: "waiting" as DbProjectStatus }
          : p
      )
    );

    const idsToArchive = [...selectedProjectIds];
    setSelectedProjectIds([]);
    showToast(`Berhasil mengarsipkan ${count} proyek ke status 'Menunggu Snapshot'`);

    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          status: "waiting",
          updated_at: new Date().toISOString(),
        })
        .in("id", idsToArchive);

      if (error) throw error;
    } catch (err) {
      console.error("Bulk archive error:", err);
      showToast("Gagal mengarsipkan proyek di database", "info");
      setProjects(initialProjects);
    }
  };

  // BULK DELETE
  const handleBulkDeleteConfirm = async () => {
    if (selectedProjectIds.length === 0) return;
    const count = selectedProjectIds.length;
    const idsToDelete = [...selectedProjectIds];

    // Optimistic update
    setProjects((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
    setSelectedProjectIds([]);
    showToast(`${count} proyek berhasil dihapus.`);

    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("projects")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Bulk delete error:", err);
      showToast("Gagal menghapus proyek dari database.", "info");
      setProjects(initialProjects);
    }
  };

  // DELETE FOLDER
  const handleDeleteFolder = async (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Hapus folder "${folder.name}"? Proyek di dalamnya akan dipindahkan ke "Tanpa Folder".`)) {
      return;
    }

    // Optimistic update
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setProjects((prev) =>
      prev.map((p) => (p.folder_id === folder.id ? { ...p, folder_id: null } : p))
    );
    if (selectedFolderFilter === folder.id) {
      setSelectedFolderFilter(null);
    }

    showToast(`Folder "${folder.name}" berhasil dihapus`);

    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("folders")
        .delete()
        .eq("id", folder.id);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Delete folder error:", err);
      showToast("Gagal menghapus folder di database", "info");
      setFolders(initialFolders);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-2.5 rounded-xl bg-[#0f1420]/95 backdrop-blur-xl border border-accent/40 text-text-primary text-body-sm shadow-2xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-accent" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* EXPLORER TOPBAR & STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-caption font-mono text-text-tertiary mb-1">
            <span>Droppr Explorer</span>
            <span>/</span>
            <span className="text-accent font-semibold">{activeFolder.name}</span>
          </div>
          <h1 className="text-heading-2 font-bold text-text-primary tracking-tight">
            {t("projects.title")}
          </h1>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {t("projects.subtitle")}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] text-text-primary hover:bg-white/[0.08] border border-white/[0.1] text-caption font-semibold transition-all inline-flex items-center gap-2 shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-accent" />
            <span>{t("projects.createFolder")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all inline-flex items-center gap-2 shadow-md shadow-accent/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("projects.createProject")}</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN EXPLORER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: FOLDER TREE DIRECTORY (DROPZONES) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary font-bold">
                {t("projects.folderDirectory")}
              </span>
              <span className="text-[10px] font-mono text-text-tertiary">
                {t("projects.dropzoneActive")}
              </span>
            </div>

            {/* Folder Navigation Items */}
            <div className="space-y-1.5">
              {/* 1. Semua Proyek */}
              <button
                type="button"
                onClick={() => setSelectedFolderFilter(null)}
                onDragOver={(e) => handleFolderDragOver(e, null)}
                onDragLeave={(e) => handleFolderDragLeave(e, null)}
                onDrop={(e) => handleFolderDrop(e, null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-caption font-medium transition-all flex items-center justify-between gap-2 border ${
                  selectedFolderFilter === null
                    ? "bg-white/[0.09] text-text-primary border-white/[0.2] shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
                } ${
                  dragOverFolderId === null && draggingProjectIds.length > 0
                    ? "ring-2 ring-accent bg-accent/20 border-accent scale-[1.02] shadow-lg shadow-accent/25"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className={`w-4 h-4 shrink-0 ${selectedFolderFilter === null ? "text-accent" : "text-text-tertiary"}`} />
                  <span className="truncate font-semibold">{t("projects.allProjects")}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-mono text-text-tertiary shrink-0">
                  {projects.length}
                </span>
              </button>

              {/* 2. Tanpa Folder (Root) */}
              <button
                type="button"
                onClick={() => setSelectedFolderFilter("root")}
                onDragOver={(e) => handleFolderDragOver(e, "root")}
                onDragLeave={(e) => handleFolderDragLeave(e, "root")}
                onDrop={(e) => handleFolderDrop(e, "root")}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-caption font-medium transition-all flex items-center justify-between gap-2 border ${
                  selectedFolderFilter === "root"
                    ? "bg-white/[0.09] text-text-primary border-white/[0.2] shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
                } ${
                  dragOverFolderId === "root" && draggingProjectIds.length > 0
                    ? "ring-2 ring-accent bg-accent/20 border-accent scale-[1.02] shadow-lg shadow-accent/25"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderOpen className={`w-4 h-4 shrink-0 ${selectedFolderFilter === "root" ? "text-accent" : "text-text-tertiary"}`} />
                  <span className="truncate">{t("projects.unorganized")}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-mono text-text-tertiary shrink-0">
                  {projects.filter((p) => p.folder_id === null).length}
                </span>
              </button>

              {/* Custom Folders */}
              {folders.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-1.5">
                  {folders.map((f) => {
                    const count = projects.filter((p) => p.folder_id === f.id).length;
                    const isSelected = selectedFolderFilter === f.id;
                    const isDragTarget = dragOverFolderId === f.id;

                    return (
                      <div
                        key={f.id}
                        onDragOver={(e) => handleFolderDragOver(e, f.id)}
                        onDragLeave={(e) => handleFolderDragLeave(e, f.id)}
                        onDrop={(e) => handleFolderDrop(e, f.id)}
                        className={`group w-full rounded-xl transition-all border flex items-center justify-between gap-1.5 pl-3 pr-2 py-2 ${
                          isSelected
                            ? "bg-white/[0.09] text-text-primary border-white/[0.2] shadow-sm"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
                        } ${
                          isDragTarget
                            ? "ring-2 ring-accent bg-accent/25 border-accent scale-[1.03] shadow-lg shadow-accent/30"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFolderFilter(f.id)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-0.5"
                        >
                          <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-accent" : "text-accent/70"}`} />
                          <span className="text-caption font-medium truncate">{f.name}</span>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-text-tertiary">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolder(f, e)}
                            className="w-5 h-5 rounded hover:bg-white/[0.1] text-text-tertiary hover:text-status-overdue flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus Folder (Proyek tidak dihapus)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick DnD Hint */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-text-tertiary leading-normal flex items-start gap-2">
              <GripVertical className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <span>
                {t("projects.dragHint")}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN WORKSPACE (TOOLBAR & PROJECTS VIEW) */}
        <div className="lg:col-span-9 space-y-4">
          {/* WORKSPACE TOOLBAR */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-black/20">
            {/* Left: Select All & Count */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-caption font-semibold text-text-secondary hover:text-text-primary transition-colors select-none"
              >
                {selectedProjectIds.length > 0 && selectedProjectIds.length === filteredProjects.length ? (
                  <CheckSquare className="w-4 h-4 text-accent" />
                ) : (
                  <Square className="w-4 h-4 text-text-tertiary" />
                )}
                <span>
                  {selectedProjectIds.length > 0
                    ? `${selectedProjectIds.length} ${t("projects.selectedCount")}`
                    : t("projects.selectAll")}
                </span>
              </button>

              <span className="text-white/20">•</span>

              <span className="text-caption font-mono text-text-tertiary">
                {filteredProjects.length} {t("projects.projectsDisplayed")}
              </span>
            </div>

            {/* Right: Search & View Mode Switcher */}
            <div className="flex items-center gap-2.5">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("projects.searchPlaceholder")}
                  className="bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[10px] text-text-tertiary hover:text-text-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View Switcher: Grid vs List */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-white/[0.1] text-accent shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-white/[0.1] text-accent shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* PROJECTS STREAM (GRID OR LIST) */}
          {filteredProjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-dashed border-white/[0.1] text-center space-y-3 shadow-xl shadow-black/20">
              <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto border border-accent/25">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h3 className="text-body-md font-semibold text-text-primary">
                {selectedFolderFilter ? t("projects.emptyFolder") : t("projects.emptyProjects")}
              </h3>
              <p className="text-caption text-text-secondary max-w-md mx-auto">
                {selectedFolderFilter
                  ? t("projects.emptyHint")
                  : (t("common.details") === "Detail"
                      ? "Tambahkan proyek airdrop pertamamu untuk mulai melacak."
                      : "Add your first airdrop project to start tracking.")}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-md shadow-accent/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("projects.createProject")}</span>
                </button>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW MODE */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredProjects.map((proj) => {
                const isSelected = selectedProjectIds.includes(proj.id);
                const isDragging = draggingProjectIds.includes(proj.id);
                const badgeStatus = proj.status.replace("_", "-") as BadgeProjectStatus;
                const folder = folders.find((f) => f.id === proj.folder_id);

                return (
                  <div
                    key={proj.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, proj.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/projects/${proj.id}`)}
                    className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none border ${
                      isSelected
                        ? "bg-accent/[0.08] border-accent/70 ring-1 ring-accent/70 shadow-lg shadow-accent/10"
                        : "bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.08] hover:border-white/[0.18] shadow-xl shadow-black/20"
                    } ${isDragging ? "opacity-35 border-dashed border-accent scale-95" : ""}`}
                  >
                    {/* Top Row: Checkbox, Drag Handle, Chain */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectProject(proj.id, e)}
                          className="p-1 -m-1 rounded-md text-text-tertiary hover:text-accent transition-colors"
                          title={isSelected ? "Batal pilih" : "Pilih proyek"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4 text-white/40 group-hover:text-white/80" />
                          )}
                        </button>

                        {proj.chain && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-secondary">
                            {proj.chain}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5" title="Tarik (drag) untuk memindahkan ke folder">
                        <GripVertical className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
                      </div>
                    </div>

                    {/* Middle: Project Name & Folder */}
                    <div className="py-3">
                      <div className="text-body-md font-bold text-text-primary group-hover:text-accent transition-colors truncate block">
                        {proj.name}
                      </div>
                      <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                        Folder: {folder ? folder.name : "Tanpa Folder"}
                      </p>
                    </div>

                    {/* Bottom Row: Status Badge & Open Linimasa */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.05]">
                      <StatusBadge status={badgeStatus} />
                      <div
                        className="p-1 rounded-lg text-text-tertiary group-hover:text-accent transition-colors"
                        title="Buka Linimasa Proyek"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST / DETAILS VIEW MODE */
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl shadow-black/20">
              <div className="divide-y divide-white/[0.05]">
                {filteredProjects.map((proj) => {
                  const isSelected = selectedProjectIds.includes(proj.id);
                  const isDragging = draggingProjectIds.includes(proj.id);
                  const badgeStatus = proj.status.replace("_", "-") as BadgeProjectStatus;
                  const folder = folders.find((f) => f.id === proj.folder_id);

                  return (
                    <div
                      key={proj.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, proj.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/projects/${proj.id}`)}
                      className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer select-none border-b border-white/[0.04] last:border-0 ${
                        isSelected
                          ? "bg-accent/[0.08]"
                          : "hover:bg-white/[0.04]"
                      } ${isDragging ? "opacity-35 border-dashed border-accent" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div title="Tarik (drag) untuk memindahkan ke folder">
                          <GripVertical className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 shrink-0" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => toggleSelectProject(proj.id, e)}
                          className="p-1 -m-1 text-text-tertiary hover:text-accent transition-colors shrink-0"
                          title={isSelected ? "Batal pilih" : "Pilih proyek"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4 text-white/40 group-hover:text-white/80" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="text-body-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate block">
                            {proj.name}
                          </div>
                        </div>
                      </div>

                      {/* Middle metadata: Chain & Folder */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        {proj.chain && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-secondary">
                            {proj.chain}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-text-tertiary w-32 truncate text-right">
                          {folder ? folder.name : "Tanpa Folder"}
                        </span>
                      </div>

                      {/* Right: Status & Link */}
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={badgeStatus} />
                        <div className="p-1.5 rounded-lg text-text-tertiary group-hover:text-accent transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BULK ACTION BAR (Meluncur dari Bawah saat ada item terpilih) */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-[#0e131b]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-2.5 sm:px-5 sm:py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(240,169,59,0.2)] flex flex-wrap items-center justify-between gap-3 max-w-2xl w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Left: Count */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/40 text-accent text-caption font-mono font-bold">
                {selectedProjectIds.length} Terpilih
              </span>
              <button
                type="button"
                onClick={() => setSelectedProjectIds([])}
                className="text-[11px] text-text-tertiary hover:text-text-primary px-1 underline"
              >
                Batal
              </button>
            </div>

            {/* Actions: Move, Archive, Delete */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Move to folder dropdown */}
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.1] rounded-xl px-2.5 py-1.5">
                <FolderInput className="w-3.5 h-3.5 text-accent" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "root") {
                      moveProjectsToFolder(selectedProjectIds, null);
                    } else if (val) {
                      moveProjectsToFolder(selectedProjectIds, val);
                    }
                    e.target.value = "";
                  }}
                  className="bg-transparent text-caption text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#0e131b] text-text-primary">
                    {t("projects.bulk.moveToFolder")}
                  </option>
                  <option value="root" className="bg-[#0e131b] text-text-primary">
                    📂 {t("projects.unorganized")}
                  </option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#0e131b] text-text-primary">
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archive */}
              <button
                type="button"
                onClick={handleBulkArchive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-text-primary text-caption font-semibold transition-all"
                title="Arsipkan proyek terpilih (Ubah status ke Menunggu Snapshot)"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{t("projects.bulk.archive")}</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-overdue/20 hover:bg-status-overdue/30 border border-status-overdue/40 text-status-overdue text-caption font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("projects.bulk.delete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onFolderCreated={(folder) => {
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
        }}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={() => router.refresh()}
        initialFolderId={
          selectedFolderFilter === "root" || selectedFolderFilter === null
            ? undefined
            : selectedFolderFilter
        }
      />

      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        count={selectedProjectIds.length}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}
