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
  RefreshCw,
  Send,
} from "lucide-react";
import { StatusBadge, type ProjectStatus as BadgeProjectStatus } from "@/components/ui/status-badge";
import { CreateFolderModal } from "@/components/features/create-folder-modal";
import { CreateProjectModal } from "@/components/features/create-project-modal";
import { BulkDeleteModal } from "@/components/features/bulk-delete-modal";
import { BatchTelegramSyncModal } from "@/components/features/batch-telegram-sync-modal";
import {
  scanProjectsTelegramBatch,
  type BatchTelegramItem,
  type ProjectScanTarget,
} from "@/lib/supabase/telegram-batch-scanner";
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

  // Batch Telegram Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [discoveredBatchItems, setDiscoveredBatchItems] = useState<BatchTelegramItem[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const batchDiscoveredMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of discoveredBatchItems) {
      map.set(item.projectId, (map.get(item.projectId) || 0) + 1);
    }
    return map;
  }, [discoveredBatchItems]);

  const handleStartBatchScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(null);

    try {
      const activeTargets: ProjectScanTarget[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        chain: p.chain,
        status: p.status,
        social_links: p.social_links as any,
      }));

      const results = await scanProjectsTelegramBatch(activeTargets, (current, total, name) => {
        setScanProgress({ current, total, name });
      });

      setDiscoveredBatchItems(results);
      if (results.length > 0) {
        setIsSyncModalOpen(true);
        showToast(
          isEn
            ? `Found ${results.length} new update(s)! Review and sync.`
            : `Ditemukan ${results.length} kabar baru! Tinjau dan simpan.`,
          "success"
        );
      } else {
        showToast(
          isEn
            ? "All active projects are already up to date."
            : "Semua proyek aktif sudah yang terbaru.",
          "info"
        );
      }
    } catch (err: any) {
      console.error("Batch scan error:", err);
      showToast(isEn ? "Failed to scan Telegram updates." : "Gagal memindai update Telegram.", "info");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleSyncComplete = (savedCount: number) => {
    // Clear items that were saved
    setDiscoveredBatchItems([]);
    showToast(
      isEn
        ? `Successfully saved ${savedCount} update(s) to project threads!`
        : `Berhasil menyimpan ${savedCount} kabar baru ke linimasa proyek!`,
      "success"
    );
  };

  // Explorer State
  // selectedFolderFilter: null = Semua Proyek, "root" = Tanpa Folder, string (UUID) = Folder ID
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "status">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Drag & Drop State
  const [draggingProjectIds, setDraggingProjectIds] = useState<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    setNotification({ message, type });
    notifyTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

    // 1. Optimistic update local state immediately
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
    <div className="w-full space-y-5 pb-24 font-sans">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-2.5 rounded-xl bg-bg-elevated border border-accent/40 text-text-primary text-body-sm shadow-xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-accent shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* 1. HEADER SECTION (MINIMALIST & CLEAN) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-text-primary font-medium">{activeFolder.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-heading-2 sm:text-heading-1 font-bold text-text-primary tracking-tight">
              {t("projects.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-caption font-mono text-text-secondary font-semibold">
              {projects.length}
            </span>
          </div>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {t("projects.subtitle")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Batch Telegram Update Scanner */}
          <button
            type="button"
            onClick={handleStartBatchScan}
            disabled={isScanning}
            className="px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-caption font-semibold transition-all inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
            title={isEn ? "Scan Telegram updates for active projects" : "Pindai kabar Telegram untuk proyek aktif"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-sky-400" : "text-sky-400"}`} />
            <span>
              {isScanning
                ? scanProgress
                  ? `${scanProgress.current}/${scanProgress.total} ${scanProgress.name.slice(0, 10)}...`
                  : (isEn ? "Scanning TG..." : "Memindai TG...")
                : (isEn ? "Check TG Updates" : "Periksa Update TG")}
            </span>
            {discoveredBatchItems.length > 0 && !isScanning && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-black">
                {discoveredBatchItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-text-primary border border-white/[0.1] text-caption font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-text-secondary" />
            <span>{t("projects.createFolder")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm shadow-accent/20 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("projects.createProject")}</span>
          </button>
        </div>
      </div>

      {/* 2. HORIZONTAL FOLDER TABS BAR (MINIMAL WITH DROPZONES) */}
      <div className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-white/[0.06]">
        {/* Tab 1: Semua Proyek */}
        <button
          type="button"
          onClick={() => setSelectedFolderFilter(null)}
          onDragOver={(e) => handleFolderDragOver(e, null)}
          onDragLeave={(e) => handleFolderDragLeave(e, null)}
          onDrop={(e) => handleFolderDrop(e, null)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-caption font-medium transition-all flex items-center gap-2 border ${
            selectedFolderFilter === null
              ? "bg-white/[0.08] text-text-primary border-white/[0.16] shadow-xs"
              : "bg-transparent text-text-tertiary hover:text-text-primary hover:bg-white/[0.03] border-transparent"
          } ${
            dragOverFolderId === null && draggingProjectIds.length > 0
              ? "ring-2 ring-accent bg-accent/15 border-accent text-accent"
              : ""
          }`}
        >
          <Folder className={`w-3.5 h-3.5 ${selectedFolderFilter === null ? "text-accent" : "text-text-tertiary"}`} />
          <span>{t("projects.allProjects")}</span>
          <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[10.5px] font-mono text-text-secondary">
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
          className={`shrink-0 px-3 py-1.5 rounded-lg text-caption font-medium transition-all flex items-center gap-2 border ${
            selectedFolderFilter === "root"
              ? "bg-white/[0.08] text-text-primary border-white/[0.16] shadow-xs"
              : "bg-transparent text-text-tertiary hover:text-text-primary hover:bg-white/[0.03] border-transparent"
          } ${
            dragOverFolderId === "root" && draggingProjectIds.length > 0
              ? "ring-2 ring-accent bg-accent/15 border-accent text-accent"
              : ""
          }`}
        >
          <FolderOpen className={`w-3.5 h-3.5 ${selectedFolderFilter === "root" ? "text-accent" : "text-text-tertiary"}`} />
          <span>{t("projects.unorganized")}</span>
          <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[10.5px] font-mono text-text-secondary">
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
              className={`group shrink-0 rounded-lg transition-all border flex items-center gap-1 pl-2.5 pr-1 py-0.5 ${
                isSelected
                  ? "bg-white/[0.08] text-text-primary border-white/[0.16] shadow-xs"
                  : "bg-transparent text-text-tertiary hover:text-text-primary hover:bg-white/[0.03] border-transparent"
              } ${
                isDragTarget
                  ? "ring-2 ring-accent bg-accent/15 border-accent text-accent"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFolderFilter(f.id)}
                className="flex items-center gap-1.5 text-caption font-medium py-1"
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"}`} />
                <span>{f.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[10.5px] font-mono text-text-secondary">
                  {count}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteFolder(f, e)}
                className="w-4 h-4 rounded text-text-disabled hover:text-status-overdue flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="shrink-0 px-2.5 py-1 rounded-lg border border-dashed border-white/[0.12] hover:border-white/[0.25] text-text-tertiary hover:text-text-primary text-[12px] font-medium inline-flex items-center gap-1 transition-colors"
        >
          <FolderPlus className="w-3 h-3" />
          <span>{isEn ? "New" : "Baru"}</span>
        </button>
      </div>

      {/* 3. TOOLBAR: SEARCH & FILTERS (STREAMLINED & RESPONSIVE) */}
      <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Left: Search input with keyboard shortcut */}
        <div className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.04] focus-within:bg-white/[0.05] border border-white/[0.08] focus-within:border-white/[0.2] rounded-xl px-3 py-2 flex-1 md:max-w-md transition-colors">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? "Filter projects by name, chain..." : "Cari proyek berdasarkan nama, jaringan..."}
            className="bg-transparent text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none w-full"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-text-tertiary hover:text-text-primary p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-[10px] font-mono text-text-disabled">
              /
            </span>
          )}
        </div>

        {/* Right: Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-2.5 py-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#14181F] text-text-primary">{isEn ? "All Status" : "Semua Status"}</option>
              <option value="in_progress" className="bg-[#14181F] text-text-primary">⚡ {isEn ? "In Progress" : "Sedang Dikerjakan"}</option>
              <option value="waiting" className="bg-[#14181F] text-text-primary">⏳ {isEn ? "Waiting Snapshot" : "Menunggu Snapshot"}</option>
              <option value="ready_to_claim" className="bg-[#14181F] text-text-primary">🎁 {isEn ? "Ready to Claim" : "Siap Klaim"}</option>
              <option value="completed" className="bg-[#14181F] text-text-primary">✅ {isEn ? "Completed" : "Selesai"}</option>
              <option value="not_started" className="bg-[#14181F] text-text-primary">⏸️ {isEn ? "Not Started" : "Belum Mulai"}</option>
            </select>
          </div>

          {/* Chain Filter */}
          {availableChains.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-2.5 py-1.5 transition-colors">
              <Layers className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <select
                value={selectedChainFilter}
                onChange={(e) => setSelectedChainFilter(e.target.value)}
                className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#14181F] text-text-primary">{isEn ? "All Chains" : "Semua Jaringan"}</option>
                {availableChains.map((c) => (
                  <option key={c} value={c} className="bg-[#14181F] text-text-primary">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-2.5 py-1.5 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-caption text-text-primary font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-[#14181F] text-text-primary">{isEn ? "Newest" : "Terbaru"}</option>
              <option value="oldest" className="bg-[#14181F] text-text-primary">{isEn ? "Oldest" : "Terlama"}</option>
              <option value="name_asc" className="bg-[#14181F] text-text-primary">A &rarr; Z</option>
              <option value="name_desc" className="bg-[#14181F] text-text-primary">Z &rarr; A</option>
              <option value="status" className="bg-[#14181F] text-text-primary">{isEn ? "Status" : "Status"}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-text-tertiary hover:text-text-primary border border-white/[0.08] transition-colors"
              title={isEn ? "Reset all filters" : "Reset semua filter"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* View Mode Switcher: Grid vs List */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08] shrink-0">
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
              title="Table / List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE SELECTION & DRAG HINT BAR */}
      <div className="flex items-center justify-between px-0.5 text-[11px] font-mono text-text-tertiary">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 font-medium text-text-secondary hover:text-text-primary transition-colors select-none"
          >
            {selectedProjectIds.length > 0 && selectedProjectIds.length === filteredProjects.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-accent" />
            ) : (
              <Square className="w-3.5 h-3.5 text-text-disabled" />
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

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-disabled">
          <GripVertical className="w-3 h-3 text-text-tertiary" />
          <span>{t("projects.dragHint")}</span>
        </div>
      </div>

      {/* 5. MAIN DISPLAY (GRID OR LIST) */}
      {filteredProjects.length === 0 ? (
        <div className="w-full py-16 px-6 rounded-2xl bg-white/[0.015] border border-dashed border-white/[0.08] text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto border border-accent/20">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h3 className="text-body-md font-semibold text-text-primary">
            {selectedFolderFilter ? t("projects.emptyFolder") : t("projects.emptyProjects")}
          </h3>
          <p className="text-caption text-text-secondary max-w-sm mx-auto">
            {selectedFolderFilter
              ? t("projects.emptyHint")
              : (isEn
                  ? "No projects match your current filter. Try adjusting your search."
                  : "Tidak ada proyek yang cocok dengan filter saat ini. Coba ubah kata kunci atau reset filter.")}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-caption font-semibold transition-all text-text-primary"
              >
                {isEn ? "Reset Filter" : "Reset Filter"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("projects.createProject")}</span>
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ====================================================================== */
        /* MODE A: RESPONSIVE FLUID GRID (OPTIMAL PROPORTIONAL CARD WIDTH)       */
        /* ====================================================================== */
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 min-[2100px]:grid-cols-5 gap-4">
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
                className={`group relative rounded-xl p-4 transition-all duration-150 cursor-pointer select-none border flex flex-col justify-between ${
                  isSelected
                    ? "bg-accent/[0.06] border-accent/60 ring-1 ring-accent/50 shadow-md shadow-accent/5"
                    : "bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.08] hover:border-white/[0.18]"
                } ${isDragging ? "opacity-30 border-dashed border-accent" : ""}`}
              >
                <div>
                  {/* Card Header: Avatar, Name, Checkbox, Drag Handle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectProject(proj.id, e)}
                        className={`p-0.5 rounded transition-opacity ${
                          isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                        }`}
                        title={isSelected ? (isEn ? "Deselect" : "Batal pilih") : (isEn ? "Select" : "Pilih")}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
                        )}
                      </button>

                      {/* Project Logo/Avatar */}
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-accent font-bold font-mono text-[12px] flex items-center justify-center shrink-0">
                        {proj.name.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Project Name & Website */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-body-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                            {proj.name}
                          </span>
                          {(batchDiscoveredMap.get(proj.id) || 0) > 0 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSyncModalOpen(true);
                              }}
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 inline-flex items-center gap-1 shrink-0 animate-pulse hover:bg-sky-500/25"
                              title={isEn ? "New update available - click to review" : "Update baru tersedia - klik untuk tinjau"}
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>{batchDiscoveredMap.get(proj.id)} Baru</span>
                            </span>
                          )}
                          {social.website && (
                            <a
                              href={social.website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-text-tertiary hover:text-link-teal transition-colors shrink-0"
                              title="Website Resmi"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Drag Handle Grip (Discreet) */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-grab active:cursor-grabbing p-1 -mr-1 text-text-disabled group-hover:text-text-secondary transition-colors"
                      title={isEn ? "Drag to move folder" : "Tarik untuk memindahkan folder"}
                    >
                      <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                    </div>
                  </div>

                  {/* Pills row: Chain & Folder */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {proj.chain ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-text-secondary truncate max-w-[120px]">
                        {proj.chain}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.06] text-text-disabled">
                        Multi-chain
                      </span>
                    )}

                    {folder && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-text-tertiary flex items-center gap-1 truncate max-w-[120px]">
                        <Folder className="w-2.5 h-2.5 text-accent/70 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Guide snippet preview if exists */}
                  {proj.guide_content && (
                    <p className="text-[11.5px] text-text-tertiary line-clamp-2 mt-2 leading-relaxed">
                      {proj.guide_content.replace(/[#*`_]/g, "")}
                    </p>
                  )}
                </div>

                {/* Card Footer: Status Badge & Relative Date */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-3.5 border-t border-white/[0.05]">
                  <StatusBadge status={badgeStatus} />
                  
                  <div className="flex items-center gap-1.5 text-text-tertiary text-[10.5px] font-mono shrink-0">
                    <span>{formatDisplayDate(proj.created_at, isEn)}</span>
                    <ArrowRight className="w-3 h-3 text-text-disabled group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ====================================================================== */
        /* MODE B: STREAMLINED TABLE / LIST VIEW                                  */
        /* ====================================================================== */
        <div className="w-full rounded-xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.08] text-[10.5px] font-mono uppercase tracking-wider text-text-tertiary font-semibold select-none">
            <div className="col-span-5 flex items-center gap-2">
              <span>{isEn ? "Project Name" : "Nama Proyek"}</span>
            </div>
            <div className="col-span-2">
              <span>Status</span>
            </div>
            <div className="col-span-2">
              <span>{isEn ? "Chain" : "Jaringan"}</span>
            </div>
            <div className="col-span-2">
              <span>Folder</span>
            </div>
            <div className="col-span-1 text-right">
              <span>{isEn ? "Updated" : "Diperbarui"}</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.04]">
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
                  className={`group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 transition-all duration-100 cursor-pointer select-none items-center ${
                    isSelected
                      ? "bg-accent/[0.06] border-l-2 border-l-accent"
                      : "hover:bg-white/[0.03]"
                  } ${isDragging ? "opacity-30 border-dashed border-accent" : ""}`}
                >
                  {/* Col 1-5: Drag, Checkbox, Avatar, Name */}
                  <div className="col-span-5 w-full flex items-center gap-2.5 min-w-0">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 text-text-disabled group-hover:text-text-secondary transition-colors"
                      title={isEn ? "Drag to folder" : "Tarik ke folder"}
                    >
                      <GripVertical className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80" />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSelectProject(proj.id, e)}
                      className={`p-0.5 rounded transition-opacity shrink-0 ${
                        isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                      }`}
                      title={isSelected ? (isEn ? "Deselect" : "Batal") : (isEn ? "Select" : "Pilih")}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
                      )}
                    </button>

                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] text-accent font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                      {proj.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name & Quick Link */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-body-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                        {proj.name}
                      </span>
                      {(batchDiscoveredMap.get(proj.id) || 0) > 0 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSyncModalOpen(true);
                          }}
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 inline-flex items-center gap-1 shrink-0 animate-pulse hover:bg-sky-500/25"
                          title={isEn ? "New update available - click to review" : "Update baru tersedia - klik untuk tinjau"}
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>{batchDiscoveredMap.get(proj.id)} Baru</span>
                        </span>
                      )}
                      {social.website && (
                        <a
                          href={social.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-text-tertiary hover:text-link-teal transition-colors shrink-0"
                          title="Website"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Col 6-7: Status */}
                  <div className="col-span-2 w-full md:w-auto flex items-center justify-between md:justify-start">
                    <StatusBadge status={badgeStatus} />
                  </div>

                  {/* Col 8-9: Chain */}
                  <div className="col-span-2 w-full md:w-auto flex items-center">
                    {proj.chain ? (
                      <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-text-secondary truncate">
                        {proj.chain}
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-mono text-text-disabled">-</span>
                    )}
                  </div>

                  {/* Col 10-11: Folder */}
                  <div className="col-span-2 w-full md:w-auto hidden md:flex items-center min-w-0">
                    <span className="text-[11.5px] text-text-secondary truncate flex items-center gap-1">
                      <Folder className="w-3 h-3 text-text-tertiary shrink-0" />
                      <span className="truncate">{folder ? folder.name : (isEn ? "Unorganized" : "Tanpa Folder")}</span>
                    </span>
                  </div>

                  {/* Col 12: Updated Date & Arrow */}
                  <div className="col-span-1 w-full md:w-auto flex items-center justify-end gap-2 text-right">
                    <span className="text-[10.5px] font-mono text-text-tertiary">
                      {formatDisplayDate(proj.created_at, isEn)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-accent transition-colors hidden md:block" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. FLOATING BULK ACTION BAR */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-bg-elevated border border-border-hairline-strong rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-150">
            {/* Left: Selected count */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-accent/20 border border-accent/40 text-accent text-[11px] font-mono font-bold">
                {selectedProjectIds.length} {isEn ? "Selected" : "Terpilih"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProjectIds([])}
                className="text-[11px] text-text-tertiary hover:text-text-primary underline"
              >
                {isEn ? "Cancel" : "Batal"}
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Move to folder */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2 py-1">
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
                  <option value="" disabled className="bg-[#14181F] text-text-primary">
                    {t("projects.bulk.moveToFolder")}
                  </option>
                  <option value="root" className="bg-[#14181F] text-text-primary">
                    📂 {t("projects.unorganized")}
                  </option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#14181F] text-text-primary">
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archive */}
              <button
                type="button"
                onClick={handleBulkArchive}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-text-primary text-caption font-semibold transition-all"
                title="Ubah status ke Menunggu Snapshot"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{t("projects.bulk.archive")}</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-overdue/15 hover:bg-status-overdue/25 border border-status-overdue/30 text-status-overdue text-caption font-semibold transition-all"
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

      <BatchTelegramSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        discoveredItems={discoveredBatchItems}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
}
