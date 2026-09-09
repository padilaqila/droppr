"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Filter,
  ArrowUpDown,
  RotateCcw,
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

interface ProjectsClientViewProps {
  initialProjects: Project[];
  initialFolders: FolderType[];
}

function formatDisplayDate(isoString: string, isEn: boolean): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      const h = Math.max(1, Math.floor(diffHours));
      return isEn ? `${h}h ago` : `${h} jam lalu`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return isEn ? `${diffDays}d ago` : `${diffDays} hari lalu`;
    }
    return d.toLocaleDateString(isEn ? "en-US" : "id-ID", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return isoString;
  }
}

export function ProjectsClientView({
  initialProjects,
  initialFolders,
}: ProjectsClientViewProps) {
  const router = useRouter();
  const { t, isEn } = useTranslation();
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

  // Explorer State
  // selectedFolderFilter: null = Semua Proyek, "root" = Tanpa Folder, string (UUID) = Folder ID
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "status">("newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
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

  // Derive unique chains list
  const availableChains = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.chain && p.chain.trim()) set.add(p.chain.trim());
    });
    return Array.from(set).sort();
  }, [projects]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Folder filter
        if (selectedFolderFilter === "root") {
          if (p.folder_id !== null) return false;
        } else if (selectedFolderFilter !== null) {
          if (p.folder_id !== selectedFolderFilter) return false;
        }

        // Status filter
        if (selectedStatusFilter !== "all" && p.status !== selectedStatusFilter) {
          return false;
        }

        // Chain filter
        if (selectedChainFilter !== "all" && p.chain?.toLowerCase() !== selectedChainFilter.toLowerCase()) {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(query);
          const matchesChain = p.chain?.toLowerCase().includes(query);
          return matchesName || matchesChain;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "status") return a.status.localeCompare(b.status);
        return 0;
      });
  }, [projects, selectedFolderFilter, selectedStatusFilter, selectedChainFilter, searchQuery, sortBy]);

  // Active folder object
  const activeFolder = useMemo(() => {
    if (selectedFolderFilter === null) return { name: t("projects.allProjects"), id: null };
    if (selectedFolderFilter === "root") return { name: t("projects.unorganized"), id: "root" };
    return folders.find((f) => f.id === selectedFolderFilter) || { name: t("projects.allProjects"), id: null };
  }, [selectedFolderFilter, folders, t]);

  const hasActiveFilters = searchQuery !== "" || selectedStatusFilter !== "all" || selectedChainFilter !== "all" || selectedFolderFilter !== null;

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedStatusFilter("all");
    setSelectedChainFilter("all");
    setSelectedFolderFilter(null);
  };

  // Multi-select toggle functions
  const toggleSelectProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProjectIds.length === filteredProjects.length) {
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
        ? (isEn ? "Unorganized" : "Tanpa Folder (Root)")
        : folders.find((f) => f.id === targetFolderId)?.name || (isEn ? "Folder" : "Folder");

    // 1. Optimistic update local state immediately (0ms lag)
    setProjects((prev) =>
      prev.map((p) => (projectIds.includes(p.id) ? { ...p, folder_id: targetFolderId } : p))
    );

    // Clear selection
    setSelectedProjectIds((prev) => prev.filter((id) => !projectIds.includes(id)));

    showToast(
      isEn
        ? `Moved ${count} project(s) to "${targetFolderName}"`
        : `Berhasil memindahkan ${count} proyek ke "${targetFolderName}"`
    );

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
      showToast(
        isEn
          ? "Failed to save folder changes to database"
          : "Gagal menyimpan pemindahan folder ke database",
        "info"
      );
      setProjects(initialProjects);
    }
  };

  // NATIVE HTML5 DRAG & DROP HANDLERS (GPU-Accelerated 60 FPS)
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    let idsToDrag = [projectId];
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

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: string | null | "root") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    let idsToMove: string[] = [];
    try {
      const data = e.dataTransfer.getData("text/plain");
      if (data) idsToMove = JSON.parse(data);
    } catch {
      idsToMove = draggingProjectIds;
    }

    if (idsToMove.length === 0) return;
    const finalFolderId = targetFolderId === "root" ? null : targetFolderId;
    moveProjectsToFolder(idsToMove, finalFolderId);
    setDraggingProjectIds([]);
  };

  // BULK ARCHIVE
  const handleBulkArchive = async () => {
    if (selectedProjectIds.length === 0) return;
    const count = selectedProjectIds.length;
    const idsToArchive = [...selectedProjectIds];

    setProjects((prev) =>
      prev.map((p) => (idsToArchive.includes(p.id) ? { ...p, status: "waiting" } : p))
    );
    setSelectedProjectIds([]);
    showToast(
      isEn
        ? `Archived ${count} project(s) to "Waiting Snapshot"`
        : `Berhasil mengarsipkan ${count} proyek ke "Menunggu Snapshot"`
    );

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
      showToast(
        isEn
          ? "Failed to archive projects in database"
          : "Gagal mengarsipkan proyek di database",
        "info"
      );
      setProjects(initialProjects);
    }
  };

  // BULK DELETE
  const handleBulkDeleteConfirm = async () => {
    if (selectedProjectIds.length === 0) return;
    const count = selectedProjectIds.length;
    const idsToDelete = [...selectedProjectIds];

    setProjects((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
    setSelectedProjectIds([]);
    showToast(
      isEn
        ? `${count} project(s) deleted successfully.`
        : `${count} proyek berhasil dihapus.`
    );

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
      showToast(
        isEn
          ? "Failed to delete projects from database."
          : "Gagal menghapus proyek dari database.",
        "info"
      );
      setProjects(initialProjects);
    }
  };

  // DELETE FOLDER
  const handleDeleteFolder = async (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmPrompt = isEn
      ? `Delete folder "${folder.name}"? Projects inside will be moved to "Unorganized".`
      : `Hapus folder "${folder.name}"? Proyek di dalamnya akan dipindahkan ke "Tanpa Folder".`;
    if (!confirm(confirmPrompt)) {
      return;
    }

    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setProjects((prev) =>
      prev.map((p) => (p.folder_id === folder.id ? { ...p, folder_id: null } : p))
    );
    if (selectedFolderFilter === folder.id) {
      setSelectedFolderFilter(null);
    }

    showToast(
      isEn
        ? `Folder "${folder.name}" deleted successfully`
        : `Folder "${folder.name}" berhasil dihapus`
    );

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
      showToast(
        isEn
          ? "Failed to delete folder in database"
          : "Gagal menghapus folder di database",
        "info"
      );
      setFolders(initialFolders);
    }
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-2.5 rounded-xl bg-[#0f1420]/95 backdrop-blur-xl border border-accent/40 text-text-primary text-body-sm shadow-2xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-accent" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 1. HEADER SECTION (FULL-WIDTH VERCEL CONSOLE STYLE) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono text-text-tertiary mb-1">
            <span>Droppr Explorer</span>
            <span>/</span>
            <span className="text-accent font-semibold">{activeFolder.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-1 font-bold text-text-primary tracking-tight">
              {t("projects.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-caption font-mono text-text-secondary font-semibold">
              {projects.length}
            </span>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
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
            className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all inline-flex items-center gap-2 shadow-md shadow-accent/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("projects.createProject")}</span>
          </button>
        </div>
      </div>

      {/* 2. HORIZONTAL FOLDER TABS BAR (VERCEL-STYLE TABS WITH ACTIVE DROPZONES) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mt-2">
        {/* Tab 1: Semua Proyek */}
        <button
          type="button"
          onClick={() => setSelectedFolderFilter(null)}
          onDragOver={(e) => handleFolderDragOver(e, null)}
          onDragLeave={(e) => handleFolderDragLeave(e, null)}
          onDrop={(e) => handleFolderDrop(e, null)}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-caption font-medium transition-all flex items-center gap-2 border ${
            selectedFolderFilter === null
              ? "bg-white/[0.1] text-text-primary border-white/[0.2] shadow-sm"
              : "bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border-white/[0.06]"
          } ${
            dragOverFolderId === null && draggingProjectIds.length > 0
              ? "ring-2 ring-accent bg-accent/20 border-accent scale-105 shadow-lg shadow-accent/25"
              : ""
          }`}
        >
          <Folder className={`w-3.5 h-3.5 ${selectedFolderFilter === null ? "text-accent" : "text-text-tertiary"}`} />
          <span className="font-semibold">{t("projects.allProjects")}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-text-tertiary">
            {projects.length}
          </span>
        </button>

        {/* Tab 2: Tanpa Folder (Root) */}
        <button
          type="button"
          onClick={() => setSelectedFolderFilter("root")}
          onDragOver={(e) => handleFolderDragOver(e, "root")}
          onDragLeave={(e) => handleFolderDragLeave(e, "root")}
          onDrop={(e) => handleFolderDrop(e, "root")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-caption font-medium transition-all flex items-center gap-2 border ${
            selectedFolderFilter === "root"
              ? "bg-white/[0.1] text-text-primary border-white/[0.2] shadow-sm"
              : "bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border-white/[0.06]"
          } ${
            dragOverFolderId === "root" && draggingProjectIds.length > 0
              ? "ring-2 ring-accent bg-accent/20 border-accent scale-105 shadow-lg shadow-accent/25"
              : ""
          }`}
        >
          <FolderOpen className={`w-3.5 h-3.5 ${selectedFolderFilter === "root" ? "text-accent" : "text-text-tertiary"}`} />
          <span>{t("projects.unorganized")}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-text-tertiary">
            {projects.filter((p) => p.folder_id === null).length}
          </span>
        </button>

        {/* Custom Folder Tabs */}
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
              className={`group shrink-0 rounded-xl transition-all border flex items-center gap-1.5 pl-3 pr-1.5 py-1 ${
                isSelected
                  ? "bg-white/[0.1] text-text-primary border-white/[0.2] shadow-sm"
                  : "bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border-white/[0.06]"
              } ${
                isDragTarget
                  ? "ring-2 ring-accent bg-accent/25 border-accent scale-105 shadow-lg shadow-accent/30"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFolderFilter(f.id)}
                className="flex items-center gap-2 text-caption font-medium py-1"
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-accent" : "text-accent/70"}`} />
                <span>{f.name}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-text-tertiary">
                  {count}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteFolder(f, e)}
                className="w-5 h-5 rounded hover:bg-white/[0.1] text-text-tertiary hover:text-status-overdue flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title={isEn ? "Delete Folder" : "Hapus Folder"}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Quick Add Folder Button */}
        <button
          type="button"
          onClick={() => setIsFolderModalOpen(true)}
          className="shrink-0 px-3 py-1.5 rounded-xl border border-dashed border-white/[0.15] hover:border-white/[0.3] text-text-tertiary hover:text-text-primary text-caption font-medium inline-flex items-center gap-1.5 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>{isEn ? "New Folder" : "Folder Baru"}</span>
        </button>
      </div>

      {/* 3. VERCEL-STYLE FILTER & SEARCH BAR (FULL WIDTH) */}
      <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-black/20">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? "Search projects by name or chain..." : "Cari proyek berdasarkan nama atau jaringan..."}
            className="bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-text-tertiary hover:text-text-primary p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-mono text-text-tertiary">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0e131b] text-text-primary">{isEn ? "All Status" : "Semua Status"}</option>
              <option value="in_progress" className="bg-[#0e131b] text-text-primary">⚡ {isEn ? "In Progress" : "Sedang Dikerjakan"}</option>
              <option value="waiting" className="bg-[#0e131b] text-text-primary">⏳ {isEn ? "Waiting Snapshot" : "Menunggu Snapshot"}</option>
              <option value="ready_to_claim" className="bg-[#0e131b] text-text-primary">🎁 {isEn ? "Ready to Claim" : "Siap Klaim"}</option>
              <option value="completed" className="bg-[#0e131b] text-text-primary">✅ {isEn ? "Completed" : "Selesai"}</option>
              <option value="not_started" className="bg-[#0e131b] text-text-primary">⏸️ {isEn ? "Not Started" : "Belum Mulai"}</option>
            </select>
          </div>

          {/* Chain Filter */}
          {availableChains.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-mono text-text-tertiary">Chain:</span>
              <select
                value={selectedChainFilter}
                onChange={(e) => setSelectedChainFilter(e.target.value)}
                className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0e131b] text-text-primary">{isEn ? "All Chains" : "Semua Jaringan"}</option>
                {availableChains.map((c) => (
                  <option key={c} value={c} className="bg-[#0e131b] text-text-primary">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-[#0e131b] text-text-primary">{isEn ? "Newest" : "Terbaru"}</option>
              <option value="oldest" className="bg-[#0e131b] text-text-primary">{isEn ? "Oldest" : "Terlama"}</option>
              <option value="name_asc" className="bg-[#0e131b] text-text-primary">A &rarr; Z</option>
              <option value="name_desc" className="bg-[#0e131b] text-text-primary">Z &rarr; A</option>
              <option value="status" className="bg-[#0e131b] text-text-primary">{isEn ? "Status" : "Status"}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-tertiary hover:text-text-primary border border-white/[0.08] transition-colors"
              title={isEn ? "Reset all filters" : "Reset semua filter"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* View Switcher: List vs Grid */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white/[0.1] text-accent shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
              title="Table / List View"
            >
              <List className="w-4 h-4" />
            </button>
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
          </div>
        </div>
      </div>

      {/* 4. ACTIVE SELECTION SUMMARY BAR */}
      <div className="flex items-center justify-between px-1 text-[12px] font-mono text-text-tertiary">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-2 font-semibold text-text-secondary hover:text-text-primary transition-colors select-none"
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
          <span>•</span>
          <span>
            {filteredProjects.length} {t("projects.projectsDisplayed")}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-caption text-text-tertiary">
          <GripVertical className="w-3.5 h-3.5 text-accent" />
          <span>{t("projects.dragHint")}</span>
        </div>
      </div>

      {/* 5. MAIN PROJECTS DISPLAY (EDGE-TO-EDGE VERCEL LIST OR GRID) */}
      {filteredProjects.length === 0 ? (
        <div className="w-full p-16 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-dashed border-white/[0.1] text-center space-y-3 shadow-xl shadow-black/20">
          <div className="w-14 h-14 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto border border-accent/25">
            <FolderGit2 className="w-7 h-7" />
          </div>
          <h3 className="text-heading-3 font-semibold text-text-primary">
            {selectedFolderFilter ? t("projects.emptyFolder") : t("projects.emptyProjects")}
          </h3>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            {selectedFolderFilter
              ? t("projects.emptyHint")
              : (isEn
                  ? "No projects match your current filter. Try adjusting your search."
                  : "Tidak ada proyek yang cocok dengan filter saat ini. Coba ubah kata kunci atau reset filter.")}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-caption font-semibold transition-all text-text-primary"
              >
                {isEn ? "Reset Filter" : "Reset Filter"}
              </button>
            )}
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
      ) : viewMode === "list" ? (
        /* ====================================================================== */
        /* MODE A: FULL-WIDTH VERCEL-STYLE TABLE / LIST VIEW                      */
        /* ====================================================================== */
        <div className="w-full rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/40">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] text-[11px] font-mono uppercase tracking-wider text-text-tertiary font-bold select-none">
            <div className="col-span-5 flex items-center gap-3">
              <span>{isEn ? "Project Name" : "Nama Proyek"}</span>
            </div>
            <div className="col-span-2">
              <span>Status</span>
            </div>
            <div className="col-span-2">
              <span>{isEn ? "Chain / Ecosystem" : "Jaringan / Chain"}</span>
            </div>
            <div className="col-span-2">
              <span>Folder</span>
            </div>
            <div className="col-span-1 text-right">
              <span>{isEn ? "Action" : "Aksi"}</span>
            </div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-white/[0.05]">
            {filteredProjects.map((proj) => {
              const isSelected = selectedProjectIds.includes(proj.id);
              const isDragging = draggingProjectIds.includes(proj.id);
              const badgeStatus = proj.status.replace("_", "-") as BadgeProjectStatus;
              const folder = folders.find((f) => f.id === proj.folder_id);
              const social = (proj.social_links as Record<string, any>) || {};

              return (
                <div
                  key={proj.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, proj.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => router.push(`/projects/${proj.id}`)}
                  className={`group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-150 cursor-pointer select-none items-center ${
                    isSelected
                      ? "bg-accent/[0.08] border-l-4 border-l-accent"
                      : "hover:bg-white/[0.04]"
                  } ${isDragging ? "opacity-30 border-dashed border-accent scale-[0.99]" : ""}`}
                >
                  {/* Col 1-5: Identity, Checkbox, Avatar, Name */}
                  <div className="col-span-5 w-full flex items-center gap-3 min-w-0">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-grab active:cursor-grabbing shrink-0"
                      title={isEn ? "Drag to move to folder" : "Tarik untuk memindahkan folder"}
                    >
                      <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSelectProject(proj.id, e)}
                      className="p-1 -m-1 text-text-tertiary hover:text-accent transition-colors shrink-0"
                      title={isSelected ? (isEn ? "Deselect" : "Batal pilih") : (isEn ? "Select project" : "Pilih proyek")}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                      )}
                    </button>

                    {/* Project Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] text-accent font-bold font-mono text-caption flex items-center justify-center shrink-0 shadow-inner">
                      {proj.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name & Quick Website Link */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                          {proj.name}
                        </span>
                        {social.website && (
                          <a
                            href={social.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-text-tertiary hover:text-link-teal transition-colors"
                            title="Website Resmi"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary block md:hidden mt-0.5">
                        {folder ? folder.name : (isEn ? "Unorganized" : "Tanpa Folder")} • {formatDisplayDate(proj.created_at, isEn)}
                      </span>
                    </div>
                  </div>

                  {/* Col 6-7: Status Badge */}
                  <div className="col-span-2 w-full md:w-auto flex items-center justify-between md:justify-start">
                    <StatusBadge status={badgeStatus} />
                  </div>

                  {/* Col 8-9: Chain Badge */}
                  <div className="col-span-2 w-full md:w-auto flex items-center">
                    {proj.chain ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-secondary truncate">
                        {proj.chain}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-text-tertiary">-</span>
                    )}
                  </div>

                  {/* Col 10-11: Folder & Date */}
                  <div className="col-span-2 w-full md:w-auto hidden md:flex flex-col justify-center min-w-0">
                    <span className="text-[12px] font-medium text-text-secondary truncate">
                      {folder ? folder.name : (isEn ? "Unorganized" : "Tanpa Folder")}
                    </span>
                    <span className="text-[10.5px] font-mono text-text-tertiary">
                      {formatDisplayDate(proj.created_at, isEn)}
                    </span>
                  </div>

                  {/* Col 12: Action Arrow */}
                  <div className="col-span-1 w-full md:w-auto flex items-center justify-end">
                    <div className="p-2 rounded-xl text-text-tertiary group-hover:text-accent group-hover:bg-white/[0.06] transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====================================================================== */
        /* MODE B: FULL-WIDTH RESPONSIVE GRID VIEW (EXPANDS ACROSS ULTRA-WIDE)    */
        /* ====================================================================== */
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
                className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer select-none border flex flex-col justify-between ${
                  isSelected
                    ? "bg-accent/[0.08] border-accent/70 ring-1 ring-accent/70 shadow-lg shadow-accent/10"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08] hover:border-white/[0.18] shadow-xl shadow-black/20"
                } ${isDragging ? "opacity-30 border-dashed border-accent scale-95" : ""}`}
              >
                {/* Top Row: Checkbox, Avatar, Drag Handle */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => toggleSelectProject(proj.id, e)}
                      className="p-1 -m-1 rounded-md text-text-tertiary hover:text-accent transition-colors"
                      title={isSelected ? (isEn ? "Deselect" : "Batal pilih") : (isEn ? "Select project" : "Pilih proyek")}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                      )}
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.1] text-accent font-bold font-mono text-caption flex items-center justify-center shrink-0">
                      {proj.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    title={isEn ? "Drag to move to folder" : "Tarik untuk memindahkan ke folder"}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>

                {/* Middle: Project Name & Chain */}
                <div className="py-4 space-y-1">
                  <div className="text-body-md font-bold text-text-primary group-hover:text-accent transition-colors truncate block">
                    {proj.name}
                  </div>
                  <div className="flex items-center gap-2">
                    {proj.chain ? (
                      <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-secondary truncate">
                        {proj.chain}
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-mono text-text-tertiary">Multi-chain</span>
                    )}
                    <span className="text-[11px] text-text-tertiary">•</span>
                    <span className="text-[11px] text-text-tertiary truncate">
                      {folder ? folder.name : (isEn ? "Unorganized" : "Tanpa Folder")}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Status Badge & Open Arrow */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.05]">
                  <StatusBadge status={badgeStatus} />
                  <div
                    className="p-1 rounded-lg text-text-tertiary group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                    title={isEn ? "Open Project Workstation" : "Buka Workstation Proyek"}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. FLOATING BULK ACTION BAR (SLIDES FROM BOTTOM ON SELECTION) */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-[#0e131b]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-2.5 sm:px-5 sm:py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(240,169,59,0.2)] flex flex-wrap items-center justify-between gap-3 max-w-2xl w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Left: Count */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/40 text-accent text-caption font-mono font-bold">
                {selectedProjectIds.length} {isEn ? "Selected" : "Terpilih"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProjectIds([])}
                className="text-[11px] text-text-tertiary hover:text-text-primary px-1 underline"
              >
                {isEn ? "Cancel" : "Batal"}
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
