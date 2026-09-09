"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Hourglass,
  RefreshCw,
  Search,
  ExternalLink,
  Rocket,
  Calendar,
  Send,
  UserCheck,
  Edit2,
  Plus,
  Sparkles,
  Link as LinkIcon,
  Filter,
  Check,
  Copy,
  Info,
  ShieldCheck,
  CheckSquare,
  ListPlus,
  Trash2,
  FolderPlus,
  Clock,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ButtonSecondary } from "@/components/ui/button";
import { ProjectReviewModal } from "@/components/features/project-review-modal";
import { createClient } from "@/lib/supabase/client";
import {
  type WaitlistItem,
  fetchWaitlists,
  updateWaitlistStatus,
  deleteWaitlist,
  convertWaitlistToProject,
  convertWaitlistToProjectWithAI,
  extractTasksFromText,
  transferWaitlistUpdateToTasks,
} from "@/lib/supabase/waitlists";

interface WaitlistClientViewProps {
  initialWaitlists: WaitlistItem[];
}

function getChannelInfo(channelId: string) {
  if (channelId === "dutacryptoairdrop") {
    return {
      name: "Duta Crypto Airdrop",
      handle: "@dutacryptoairdrop",
      logo: "/images/credits/dutacrypto.webp",
    };
  }
  if (channelId === "airdropfind") {
    return {
      name: "Airdrop Finder",
      handle: "@airdropfind",
      logo: "/images/credits/airdropfinder.webp",
    };
  }
  return {
    name: channelId,
    handle: `@${channelId}`,
    logo: null,
  };
}

export function WaitlistClientView({ initialWaitlists }: WaitlistClientViewProps) {
  const router = useRouter();
  const [waitlists, setWaitlists] = useState<WaitlistItem[]>(initialWaitlists);
  const [activeTab, setActiveTab] = useState<"joined" | "pending">("joined");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "dutacryptoairdrop" | "airdropfind">("all");

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Join / Edit Account Modal state
  const [targetItemForJoin, setTargetItemForJoin] = useState<WaitlistItem | null>(null);
  const [accountInput, setAccountInput] = useState("");
  const [refLinkInput, setRefLinkInput] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // TG Search Update Modal state
  const [tgSearchTarget, setTgSearchTarget] = useState<WaitlistItem | null>(null);
  const [tgSearchChannel, setTgSearchChannel] = useState<"dutacryptoairdrop" | "airdropfind">("dutacryptoairdrop");
  const [tgUpdates, setTgUpdates] = useState<any[]>([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Convert project state
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Transfer tasks to project states
  const [existingProjects, setExistingProjects] = useState<{ id: string; name: string }[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferProjectMode, setTransferProjectMode] = useState<"new" | "existing">("new");
  const [selectedExistingProjectId, setSelectedExistingProjectId] = useState<string>("");
  const [transferProjectName, setTransferProjectName] = useState<string>("");
  const [transferTaskType, setTransferTaskType] = useState<"one_time" | "daily">("one_time");
  const [transferTaskList, setTransferTaskList] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState<string>("");
  const [transferSourceUrl, setTransferSourceUrl] = useState<string>("");
  const [transferRawText, setTransferRawText] = useState<string>("");
  const [transferWaitlistRef, setTransferWaitlistRef] = useState<WaitlistItem | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccessNotification, setTransferSuccessNotification] = useState<{
    projectId: string;
    count: number;
    name: string;
  } | null>(null);

  // Detail Modal state (for viewing all hidden steps & full telegram text)
  const [detailModalTarget, setDetailModalTarget] = useState<WaitlistItem | null>(null);
  const [detailCopied, setDetailCopied] = useState(false);
  const [reviewingWaitlist, setReviewingWaitlist] = useState<WaitlistItem | null>(null);

  // Convert waitlist item directly into Droppr project (AI or manual)
  const handleConvertWaitlist = async (waitlist: WaitlistItem, useAI: boolean = true) => {
    if (convertingId) return;
    setConvertingId(waitlist.id);
    try {
      const newProjectId = useAI
        ? await convertWaitlistToProjectWithAI(waitlist)
        : await convertWaitlistToProject(waitlist);

      if (newProjectId) {
        router.push(`/projects/${newProjectId}`);
      }
    } catch (err) {
      console.error("Convert waitlist error:", err);
    } finally {
      setConvertingId(null);
    }
  };

  useEffect(() => {
    const supabase = createClient() as any;
    supabase
      .from("projects")
      .select("id, name")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => {
        if (data && Array.isArray(data)) {
          setExistingProjects(data.map((row: any) => ({ id: String(row.id), name: String(row.name) })));
          if (data.length > 0) {
            setSelectedExistingProjectId(String(data[0].id));
          }
        }
      });
  }, []);

  const handleOpenTransferModalFromUpdate = (post: any, waitlist: WaitlistItem) => {
    const detectedTasks = extractTasksFromText(post.text);
    setTransferWaitlistRef(waitlist);
    setTransferProjectName(waitlist.project_name);
    setTransferSourceUrl(post.postUrl || "");
    setTransferRawText(post.text || "");
    setTransferTaskList(detectedTasks);
    setTransferProjectMode(existingProjects.some((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase()) ? "existing" : "new");
    if (existingProjects.some((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase())) {
      const match = existingProjects.find((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase());
      if (match) setSelectedExistingProjectId(match.id);
    }
    setTransferTaskType("one_time");
    setNewTaskInput("");
    setTransferModalOpen(true);
  };

  const handleOpenTransferModalFromWaitlistDirect = (waitlist: WaitlistItem) => {
    setTransferWaitlistRef(waitlist);
    setTransferProjectName(waitlist.project_name);
    setTransferSourceUrl(waitlist.source_url || "");
    setTransferRawText(waitlist.raw_text || "");
    setTransferTaskList(
      waitlist.tasks && waitlist.tasks.length > 0
        ? [...waitlist.tasks]
        : extractTasksFromText(waitlist.raw_text)
    );
    setTransferProjectMode(existingProjects.some((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase()) ? "existing" : "new");
    if (existingProjects.some((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase())) {
      const match = existingProjects.find((p) => p.name.toLowerCase() === waitlist.project_name.toLowerCase());
      if (match) setSelectedExistingProjectId(match.id);
    }
    setTransferTaskType("one_time");
    setNewTaskInput("");
    setTransferModalOpen(true);
  };

  const handleAddCustomTaskToTransfer = () => {
    if (!newTaskInput.trim()) return;
    setTransferTaskList((prev) => [...prev, newTaskInput.trim()]);
    setNewTaskInput("");
  };

  const handleRemoveTaskFromTransfer = (idx: number) => {
    setTransferTaskList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExecuteTransferTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferTaskList.length === 0) {
      alert("Masukkan setidaknya 1 instruksi tugas.");
      return;
    }

    setIsTransferring(true);
    try {
      const result = await transferWaitlistUpdateToTasks({
        projectName: transferProjectName.trim(),
        sourceUrl: transferSourceUrl,
        rawText: transferRawText,
        tasks: transferTaskList,
        existingProjectId: transferProjectMode === "existing" ? selectedExistingProjectId : undefined,
        registeredAccount: transferWaitlistRef?.registered_account || undefined,
        refLink: transferWaitlistRef?.ref_link || undefined,
        taskType: transferTaskType,
      });

      if (result) {
        setTransferModalOpen(false);
        setTgSearchTarget(null);
        setTransferSuccessNotification({
          projectId: result.projectId,
          count: result.taskCount,
          name:
            transferProjectMode === "existing"
              ? existingProjects.find((p) => p.id === selectedExistingProjectId)?.name || transferProjectName
              : transferProjectName,
        });

        // Re-fetch existing projects
        const supabase = createClient() as any;
        supabase.from("projects").select("id, name").then(({ data }: { data: any[] | null }) => {
          if (data && Array.isArray(data)) {
            setExistingProjects(data.map((row: any) => ({ id: String(row.id), name: String(row.name) })));
          }
        });
      }
    } catch (err) {
      console.error("Execute transfer tasks error:", err);
      alert("Gagal memindahkan tugas airdrop.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Refresh data from supabase
  const reloadData = async () => {
    const updated = await fetchWaitlists();
    setWaitlists(updated);
  };

  // Sync 90 days from Telegram
  const handleSyncTelegram = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/waitlist/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyinkronkan waitlist.");

      setSyncMessage(data.message || "Sinkronisasi waitlist selesai.");
      await reloadData();
    } catch (err: any) {
      console.error("Waitlist sync error:", err);
      setSyncMessage(err?.message || "Terjadi kesalahan saat menyinkronkan waitlist.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Join/Edit modal
  const handleOpenJoinModal = (item: WaitlistItem) => {
    setTargetItemForJoin(item);
    setAccountInput(item.registered_account || "");
    setRefLinkInput(item.ref_link || "");
  };

  // Save Join / Edit status
  const handleSaveJoinStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItemForJoin) return;

    setIsSavingStatus(true);
    try {
      const success = await updateWaitlistStatus(
        targetItemForJoin.id,
        "joined",
        accountInput.trim() || undefined,
        refLinkInput.trim() || undefined
      );

      if (success) {
        setTargetItemForJoin(null);
        await reloadData();
        setActiveTab("joined");
      }
    } catch (err) {
      console.error("Save join status error:", err);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Unjoin / revert to pending
  const handleRevertToPending = async (id: string) => {
    if (!confirm("Pindahkan waitlist ini kembali ke daftar eksplorasi?")) return;
    const success = await updateWaitlistStatus(id, "pending");
    if (success) await reloadData();
  };

  // Delete waitlist
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item waitlist ini?")) return;
    const success = await deleteWaitlist(id);
    if (success) {
      setWaitlists((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Convert to Project Droppr (direct shortcut)
  const _handleConvertToProject = async (item: WaitlistItem) => {
    setConvertingId(item.id);
    try {
      const newProjectId = await convertWaitlistToProject(item);
      if (newProjectId) {
        router.push(`/projects/${newProjectId}`);
      } else {
        alert("Gagal mengonversi waitlist menjadi proyek.");
      }
    } catch (err) {
      console.error("Convert to project error:", err);
    } finally {
      setConvertingId(null);
    }
  };

  // Open TG Search Updates Modal
  const handleOpenTgSearch = async (item: WaitlistItem) => {
    setTgSearchTarget(item);
    setTgSearchChannel("dutacryptoairdrop");
    fetchTgUpdates(item.project_name, "dutacryptoairdrop");
  };

  const fetchTgUpdates = async (query: string, ch: "dutacryptoairdrop" | "airdropfind") => {
    if (!query.trim()) return;
    setTgLoading(true);
    setTgError(null);
    try {
      const res = await fetch(`/api/telegram/search?q=${encodeURIComponent(query.trim())}&channel=${ch}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencari update Telegram.");
      setTgUpdates(data.updates || []);
    } catch (err: any) {
      console.error("Fetch TG updates error:", err);
      setTgError(err?.message || "Terjadi kesalahan saat memuat update Telegram.");
    } finally {
      setTgLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered waitlists
  const filteredWaitlists = useMemo(() => {
    return waitlists.filter((item) => {
      // Tab filter
      if (item.status !== activeTab) return false;

      // Channel filter
      if (channelFilter !== "all" && item.channel !== channelFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.project_name.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = (item.summary || "").toLowerCase().includes(q);
        const matchAccount = (item.registered_account || "").toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchSummary && !matchAccount) return false;
      }

      return true;
    });
  }, [waitlists, activeTab, channelFilter, searchQuery]);

  const joinedCount = useMemo(() => waitlists.filter((w) => w.status === "joined").length, [waitlists]);
  const pendingCount = useMemo(() => waitlists.filter((w) => w.status === "pending").length, [waitlists]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shadow-lg shadow-accent/10">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-heading-2 font-bold text-text-primary tracking-tight flex items-center gap-2">
                <span>Waitlist Airdrop</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-accent/15 text-accent border border-accent/30 shadow-xs">
                  Rentang 90 Hari
                </span>
              </h1>
              <p className="text-body-sm text-text-secondary mt-0.5">
                Kelola proyek waitlist yang kamu ikuti, catat akun terdaftar, dan pantau update terbaru langsung dari Telegram.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncTelegram}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-on-accent font-semibold text-caption sm:text-body-sm hover:bg-accent-pressed disabled:opacity-50 transition-all shadow-lg shadow-accent/20"
            title="Pindai postingan waitlist dari Telegram 3 bulan terakhir"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Memindai 90 Hari..." : "Sinkronkan Telegram 90 Hari"}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="p-3.5 rounded-xl bg-accent/10 backdrop-blur-md border border-accent/25 text-accent text-body-sm flex items-center justify-between shadow-lg shadow-accent/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0 animate-pulse" />
            <span>{syncMessage}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-text-tertiary hover:text-text-primary text-xs ml-2 font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Task Transfer Success Banner */}
      {transferSuccessNotification && (
        <div className="p-3.5 rounded-xl bg-status-completed/15 backdrop-blur-md border border-status-completed/30 flex items-center justify-between gap-3 shadow-lg shadow-status-completed/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Check className="w-5 h-5 text-status-completed shrink-0 stroke-[3]" />
            <div className="text-body-sm text-text-primary">
              Berhasil memindahkan <strong>{transferSuccessNotification.count} tugas</strong> ke proyek <strong>{transferSuccessNotification.name}</strong>!
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/projects/${transferSuccessNotification.projectId}`)}
              className="px-3 py-1.5 rounded-lg bg-status-completed text-white text-caption font-semibold hover:opacity-90 transition-opacity"
            >
              Buka Proyek →
            </button>
            <button
              onClick={() => setTransferSuccessNotification(null)}
              className="text-text-tertiary hover:text-text-primary text-xs font-mono px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs & Filters (Liquid Frosted Glass) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Dual Tabs */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] overflow-x-auto no-scrollbar self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("joined")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-caption sm:text-body-sm font-semibold transition-all shrink-0 ${
              activeTab === "joined"
                ? "bg-status-completed/20 text-status-completed border border-status-completed/30 shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <UserCheck className="w-4 h-4 text-status-completed shrink-0" />
            <span>Waitlist yang Saya Ikuti</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-status-completed/20 text-status-completed font-bold">
              {joinedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-caption sm:text-body-sm font-semibold transition-all shrink-0 ${
              activeTab === "pending"
                ? "bg-accent/20 text-accent border border-accent/30 shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
            }`}
          >
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <span>Eksplorasi Waitlist Baru</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-accent/20 text-accent font-bold">
              {pendingCount}
            </span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Channel selector filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="bg-transparent text-caption text-text-primary focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#0e131b] text-text-primary">Semua Channel</option>
              <option value="dutacryptoairdrop" className="bg-[#0e131b] text-text-primary">Duta Crypto</option>
              <option value="airdropfind" className="bg-[#0e131b] text-text-primary">Airdrop Finder</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari proyek / email terdaftar..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {filteredWaitlists.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-dashed border-white/[0.1] p-8 space-y-3 shadow-xl shadow-black/20">
          <Hourglass className="w-10 h-10 text-text-tertiary mx-auto opacity-50 stroke-1" />
          <p className="text-body-md text-text-secondary font-medium">
            {activeTab === "joined"
              ? "Belum ada proyek waitlist yang kamu ikuti."
              : "Tidak ada data waitlist baru yang cocok dengan filter pencarian."}
          </p>
          <p className="text-caption text-text-tertiary max-w-md mx-auto">
            {activeTab === "joined"
              ? "Buka tab 'Eksplorasi Waitlist Baru' di atas lalu klik [+ Tandai Sudah Join] pada proyek yang telah kamu daftarkan."
              : "Klik tombol 'Sinkronkan Telegram 90 Hari' di kanan atas untuk memindai postingan waitlist terbaru dari channel Telegram."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredWaitlists.map((item) => {
            const isJoined = item.status === "joined";
            const channelInfo = getChannelInfo(item.channel);

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-5 sm:p-6 backdrop-blur-xl border flex flex-col justify-between transition-all duration-200 shadow-xl shadow-black/20 space-y-4 group relative ${
                  isJoined
                    ? "bg-white/[0.03] border-status-completed/30 hover:border-status-completed/50"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                {/* Card Top Information */}
                <div className="space-y-3.5">
                  {/* Channel & Date Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 bg-white/[0.05] shrink-0 flex items-center justify-center">
                        {channelInfo.logo ? (
                          <Image
                            src={channelInfo.logo}
                            alt={channelInfo.name}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Send className="w-3 h-3 text-link-teal" />
                        )}
                      </div>
                      <span className="text-caption font-medium text-text-secondary truncate">
                        {channelInfo.name}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-text-tertiary flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-text-tertiary/70" />
                      <span>{formatDate(item.created_at)}</span>
                    </span>
                  </div>

                  {/* Project Name & Title */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-body-md font-bold text-text-primary tracking-tight truncate">
                        {item.project_name}
                      </h3>
                      {isJoined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-completed/15 text-status-completed border border-status-completed/30 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Joined</span>
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {item.title}
                    </p>
                  </div>

                  {/* Registered Account Section for Joined items */}
                  {isJoined && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-tertiary font-semibold flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-status-completed" />
                          <span>Akun Terdaftar:</span>
                        </span>
                        <button
                          onClick={() => handleOpenJoinModal(item)}
                          className="text-accent hover:text-accent-hover inline-flex items-center gap-1 font-medium transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <p className="text-caption font-mono font-medium text-text-primary truncate">
                        {item.registered_account || (
                          <span className="text-text-tertiary italic">Belum ada catatan akun</span>
                        )}
                      </p>
                      {item.joined_at && (
                        <p className="text-[10px] text-text-tertiary font-mono">
                          Bergabung: {formatDate(item.joined_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tasks Preview */}
                  {item.tasks && item.tasks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">
                          Instruksi Pendaftaran:
                        </span>
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-tertiary hover:text-link-teal inline-flex items-center gap-1 font-mono transition-colors"
                          title="Buka postingan asli di Telegram"
                        >
                          <span>Buka TG</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      <ul className="space-y-1">
                        {item.tasks.slice(0, 3).map((task, idx) => (
                          <li key={idx} className="text-caption text-text-secondary flex items-start gap-1.5">
                            <span className="text-accent shrink-0 mt-0.5">•</span>
                            <span className="line-clamp-1">{task}</span>
                          </li>
                        ))}
                      </ul>

                      {item.tasks.length > 3 && (
                        <div className="pt-0.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setDetailModalTarget(item)}
                            className="text-[11px] text-accent hover:text-accent-hover font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Klik untuk membuka popup seluruh langkah pendaftaran lengkap"
                          >
                            <span>+{item.tasks.length - 3} langkah lainnya (Lihat Semua)</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* External Referral / Form Link if any */}
                  {item.ref_link && (
                    <div className="pt-1">
                      <a
                        href={item.ref_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-caption text-link-teal hover:underline font-mono truncate max-w-full"
                      >
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.ref_link}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3.5 border-t border-white/[0.06] mt-3 space-y-2">
                  {isJoined ? (
                    /* ACTIONS FOR JOINED WAITLIST */
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        {/* UPDATE TG BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenTgSearch(item)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-link-teal/40 text-link-teal hover:bg-link-teal/10 text-caption font-semibold transition-all shadow-xs"
                          title="Cari perkembangan terbaru dari Telegram untuk proyek ini"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Update TG</span>
                        </button>

                        {/* + PROYEK REVIEW MODAL */}
                        <button
                          type="button"
                          onClick={() => setReviewingWaitlist(item)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-lg shadow-accent/20"
                          title="Review dan buat proyek Droppr"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>+ Proyek</span>
                        </button>
                      </div>

                      {/* Baris Tunggal Utilitas yang Rapi & Lega */}
                      <div className="flex items-center justify-end gap-2 text-caption pt-0.5 text-text-tertiary">
                        <button
                          type="button"
                          onClick={() => handleRevertToPending(item.id)}
                          className="text-text-tertiary hover:text-text-secondary text-[11px] transition-colors"
                          title="Kembalikan ke tab Eksplorasi"
                        >
                          Batal Join
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-text-tertiary hover:text-status-overdue text-[11px] transition-colors"
                          title="Hapus waitlist"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ACTIONS FOR PENDING EXPLORATION WAITLIST */
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleOpenJoinModal(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-all shadow-lg shadow-accent/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tandai Sudah Join</span>
                      </button>

                      <div className="flex items-center justify-between text-caption pt-1 text-text-tertiary">
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-secondary hover:text-link-teal hover:underline inline-flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Send className="w-3 h-3 text-link-teal" />
                          <span>Buka Telegram</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-text-tertiary hover:text-status-overdue text-[11px] transition-colors"
                          title="Abaikan dan hapus"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CATAT AKUN PENDAFTARAN WAITLIST                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(targetItemForJoin)}
        onClose={() => setTargetItemForJoin(null)}
        title={`Catat Pendaftaran Waitlist: ${targetItemForJoin?.project_name || ""}`}
        description="Simpan informasi akun atau email yang kamu gunakan untuk mendaftar waitlist ini agar tidak lupa saat distribusi."
        maxWidth="md"
      >
        <form onSubmit={handleSaveJoinStatus} className="space-y-4">
          <div>
            <label className="block text-caption font-semibold text-text-primary mb-1">
              Akun / Email Terdaftar <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              placeholder="Contoh: airdrop_hunter@gmail.com / @username_x / 0x123..."
              className="w-full px-3 py-2 rounded-md bg-bg-elevated border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              Catatan email, wallet, atau handle sosial media yang dipakai saat submit waitlist.
            </p>
          </div>

          <div>
            <label className="block text-caption font-semibold text-text-primary mb-1">
              Link Referal / URL Pendaftaran (Opsional)
            </label>
            <input
              type="url"
              value={refLinkInput}
              onChange={(e) => setRefLinkInput(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-md bg-bg-elevated border border-border-hairline text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
            <ButtonSecondary type="button" onClick={() => setTargetItemForJoin(null)}>
              Batal
            </ButtonSecondary>
            <button
              type="submit"
              disabled={isSavingStatus}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-text-inverse font-semibold text-body-sm hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isSavingStatus ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Simpan Catatan</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CARI UPDATE TELEGRAM UNTUK PROYEK WAITLIST      */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(tgSearchTarget)}
        onClose={() => setTgSearchTarget(null)}
        title={`Update Telegram: ${tgSearchTarget?.project_name || ""}`}
        description="Pantau perkembangan terbaru apakah waitlist ini sudah merilis TGE, snapshot, claim reward, atau tesnet lanjutan."
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[75vh] flex flex-col">
          {/* Channel Selector Header */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-elevated border border-border-hairline shrink-0">
            <span className="text-caption font-semibold text-text-primary">
              Pilih Channel:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTgSearchChannel("dutacryptoairdrop");
                  if (tgSearchTarget) fetchTgUpdates(tgSearchTarget.project_name, "dutacryptoairdrop");
                }}
                className={`px-3 py-1 rounded text-caption font-semibold transition-colors ${
                  tgSearchChannel === "dutacryptoairdrop"
                    ? "bg-accent text-text-inverse"
                    : "text-text-secondary hover:bg-bg-elevated-2"
                }`}
              >
                Duta Crypto
              </button>
              <button
                type="button"
                onClick={() => {
                  setTgSearchChannel("airdropfind");
                  if (tgSearchTarget) fetchTgUpdates(tgSearchTarget.project_name, "airdropfind");
                }}
                className={`px-3 py-1 rounded text-caption font-semibold transition-colors ${
                  tgSearchChannel === "airdropfind"
                    ? "bg-accent text-text-inverse"
                    : "text-text-secondary hover:bg-bg-elevated-2"
                }`}
              >
                Airdrop Finder
              </button>
            </div>
          </div>

          {/* Error display */}
          {tgError && (
            <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
              {tgError}
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[260px]">
            {tgLoading ? (
              <div className="py-14 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-accent mx-auto" />
                <p className="text-body-sm text-text-secondary">
                  Mencari update &quot;{tgSearchTarget?.project_name}&quot; di Telegram...
                </p>
              </div>
            ) : tgUpdates.length === 0 ? (
              <div className="py-14 text-center space-y-2 p-6 rounded-lg bg-bg-elevated/40 border border-dashed border-border-hairline">
                <Info className="w-8 h-8 text-text-tertiary mx-auto" />
                <p className="text-body-sm text-text-secondary font-medium">
                  Belum ditemukan postingan lanjutan mengenai &quot;{tgSearchTarget?.project_name}&quot; di channel ini.
                </p>
                <p className="text-caption text-text-tertiary">
                  Coba beralih ke channel sebelah atau cek kembali saat ada pengumuman resmi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-text-tertiary px-1">
                  Ditemukan {tgUpdates.length} pesan terkait di {tgSearchChannel === "dutacryptoairdrop" ? "Duta Crypto" : "Airdrop Finder"}:
                </div>

                {tgUpdates.map((post) => {
                  const isCopied = copiedId === post.id;
                  return (
                    <div
                      key={post.id}
                      className="p-3.5 rounded-lg bg-bg-elevated border border-border-hairline hover:border-border-hairline-strong transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-caption font-semibold text-text-primary flex items-center gap-1">
                            <Send className="w-3 h-3 text-link-teal" />
                            <span>{post.channelName}</span>
                          </span>
                          <span className="text-[11px] font-mono text-text-tertiary">
                            {formatDate(post.date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(post.id, post.text)}
                            className="p-1 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-elevated transition-colors"
                            title="Salin isi pesan"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-status-completed" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated-2 text-link-teal hover:underline text-[11px] font-medium border border-border-hairline"
                          >
                            <span>Buka di TG</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>

                      <p className="text-body-sm text-text-primary leading-relaxed whitespace-pre-line">
                        {post.text}
                      </p>

                      {/* Action to transfer tasks from this post */}
                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                        <span className="text-[11px] text-text-tertiary">
                          Ada task baru di pesan ini?
                        </span>
                        <button
                          type="button"
                          onClick={() => tgSearchTarget && handleOpenTransferModalFromUpdate(post, tgSearchTarget)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent text-text-inverse hover:bg-accent-hover text-[11px] font-semibold transition-colors shadow-xs"
                          title="Ekstrak langkah-langkah tugas dari pesan ini dan pindahkan ke tugas proyek airdrop"
                        >
                          <Rocket className="w-3 h-3" />
                          <span>+ Pindahkan ke Tugas Airdrop</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Convert to Project option */}
          <div className="pt-3 border-t border-border-hairline flex items-center justify-between gap-2 shrink-0">
            {tgSearchTarget && (
              <button
                type="button"
                onClick={() => {
                  setTgSearchTarget(null);
                  handleOpenTransferModalFromWaitlistDirect(tgSearchTarget);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 text-caption font-semibold transition-colors"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Pindahkan Waitlist Ini ke Tugas Droppr</span>
              </button>
            )}

            <ButtonSecondary type="button" onClick={() => setTgSearchTarget(null)}>
              Tutup
            </ButtonSecondary>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: PINDAHKAN UPDATE KE TUGAS AIRDROP BARU          */}
      {/* ======================================================== */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Pindahkan ke Tugas Airdrop: ${transferProjectName}`}
        description="Pindahkan instruksi tugas dari waitlist atau pesan update Telegram ini ke manajemen tugas resmi Droppr."
        maxWidth="lg"
      >
        <form onSubmit={handleExecuteTransferTasks} className="space-y-4 max-h-[75vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Target Project Mode Selection */}
            <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-2.5">
              <label className="block text-caption font-semibold text-text-primary">
                Tujuan Penyimpanan Proyek:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferProjectMode("new")}
                  className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                    transferProjectMode === "new"
                      ? "bg-accent/15 border-accent text-text-primary ring-1 ring-accent/30"
                      : "bg-bg-elevated-2 border-border-hairline text-text-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderPlus className="w-4 h-4 text-accent shrink-0" />
                    <div className="truncate">
                      <div className="text-caption font-semibold">Buat Proyek Baru</div>
                      <div className="text-[11px] text-text-tertiary truncate">{transferProjectName}</div>
                    </div>
                  </div>
                  {transferProjectMode === "new" && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (existingProjects.length > 0) {
                      setTransferProjectMode("existing");
                    } else {
                      alert("Belum ada proyek lain yang terdaftar. Gunakan 'Buat Proyek Baru'.");
                    }
                  }}
                  className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                    transferProjectMode === "existing"
                      ? "bg-accent/15 border-accent text-text-primary ring-1 ring-accent/30"
                      : "bg-bg-elevated-2 border-border-hairline text-text-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListPlus className="w-4 h-4 text-link-teal shrink-0" />
                    <div className="min-w-0">
                      <div className="text-caption font-semibold">Gabung Proyek Ada</div>
                      <div className="text-[11px] text-text-tertiary">Pilih ({existingProjects.length} proyek)</div>
                    </div>
                  </div>
                  {transferProjectMode === "existing" && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>
              </div>

              {transferProjectMode === "new" ? (
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Nama Proyek:</label>
                  <input
                    type="text"
                    required
                    value={transferProjectName}
                    onChange={(e) => setTransferProjectName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-bg-surface border border-border-hairline text-body-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Pilih Proyek Penerima Tugas:</label>
                  <select
                    value={selectedExistingProjectId}
                    onChange={(e) => setSelectedExistingProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-bg-surface border border-border-hairline text-body-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {existingProjects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Task Type selector */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated border border-border-hairline">
              <span className="text-caption font-semibold text-text-primary">
                Kategori / Siklus Tugas:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTransferTaskType("one_time")}
                  className={`px-3 py-1 rounded text-caption font-semibold transition-colors ${
                    transferTaskType === "one_time"
                      ? "bg-accent text-text-inverse"
                      : "text-text-secondary hover:bg-bg-elevated-2"
                  }`}
                >
                  Sekali Selesai (One-time)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferTaskType("daily")}
                  className={`px-3 py-1 rounded text-caption font-semibold transition-colors ${
                    transferTaskType === "daily"
                      ? "bg-accent text-text-inverse"
                      : "text-text-secondary hover:bg-bg-elevated-2"
                  }`}
                >
                  Tugas Harian (Daily)
                </button>
              </div>
            </div>

            {/* Task Checklist Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-caption font-semibold text-text-primary flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-accent" />
                  <span>Daftar Tugas ({transferTaskList.length}):</span>
                </label>
                <span className="text-[11px] text-text-tertiary">
                  Dapat diedit atau dihapus
                </span>
              </div>

              {transferTaskList.length === 0 ? (
                <div className="p-4 rounded-md bg-bg-elevated text-center text-caption text-text-tertiary">
                  Belum ada langkah tugas. Tambahkan tugas di bawah.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {transferTaskList.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-bg-elevated border border-border-hairline text-caption"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-text-tertiary w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTransferTaskList((prev) =>
                              prev.map((t, i) => (i === idx ? val : t))
                            );
                          }}
                          className="w-full bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-accent pb-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskFromTransfer(idx)}
                        className="p-1 text-text-tertiary hover:text-status-overdue transition-colors shrink-0"
                        title="Hapus baris tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Task Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTaskToTransfer();
                    }
                  }}
                  placeholder="+ Tambah baris instruksi tugas baru..."
                  className="flex-1 px-3 py-1.5 rounded-md bg-bg-elevated border border-border-hairline text-caption text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTaskToTransfer}
                  className="px-3 py-1.5 rounded-md bg-bg-elevated-2 border border-border-hairline hover:bg-bg-elevated text-caption font-semibold text-text-primary transition-colors shrink-0"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border-hairline flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-text-tertiary">
              Tugas akan langsung muncul di halaman Tasks dan Thread Workspace.
            </span>
            <div className="flex items-center gap-2">
              <ButtonSecondary type="button" onClick={() => setTransferModalOpen(false)}>
                Batal
              </ButtonSecondary>
              <button
                type="submit"
                disabled={isTransferring || transferTaskList.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-text-inverse font-semibold text-body-sm hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                {isTransferring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                <span>Simpan ke Tugas Airdrop</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: DETAIL INSTRUKSI & POSTINGAN TELEGRAM LENGKAP   */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(detailModalTarget)}
        onClose={() => setDetailModalTarget(null)}
        title={detailModalTarget ? `Instruksi: ${detailModalTarget.project_name}` : "Detail Waitlist"}
        description={
          detailModalTarget
            ? `Postingan dari ${
                detailModalTarget.channel === "dutacryptoairdrop" ? "Duta Crypto" : "Airdrop Finder"
              } • ${formatDate(detailModalTarget.created_at)}`
            : ""
        }
        maxWidth="lg"
      >
        {detailModalTarget && (
          <div className="space-y-4 max-h-[75vh] flex flex-col p-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Seluruh Langkah Pendaftaran Lengkap */}
              {detailModalTarget.tasks && detailModalTarget.tasks.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-lg bg-bg-elevated border border-border-hairline">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-accent" />
                      <span>Seluruh Langkah Pendaftaran ({detailModalTarget.tasks.length}):</span>
                    </span>
                    <span className="text-[11px] font-mono text-text-tertiary">
                      Lengkap tanpa terpotong
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {detailModalTarget.tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2 rounded-md bg-bg-surface border border-border-subtle text-caption text-text-primary"
                      >
                        <span className="text-[11px] font-mono font-semibold text-accent w-5 text-right shrink-0 mt-0.5">
                          {idx + 1}.
                        </span>
                        <span className="leading-relaxed break-words flex-1 select-text">
                          {task}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tautan Form / Referral jika ada */}
              {detailModalTarget.ref_link && (
                <div className="p-3 rounded-lg bg-bg-elevated border border-border-hairline space-y-1">
                  <span className="text-[11px] font-mono text-text-tertiary uppercase">
                    Tautan Form / Referral Resmi:
                  </span>
                  <div>
                    <a
                      href={detailModalTarget.ref_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-caption text-link-teal hover:underline font-mono break-all"
                    >
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{detailModalTarget.ref_link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              {/* Teks Asli Postingan Telegram */}
              <div className="space-y-1.5 p-3.5 rounded-lg bg-bg-elevated border border-border-hairline">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-link-teal" />
                    <span>Teks Asli dari Channel Telegram:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (detailModalTarget.raw_text) {
                        navigator.clipboard.writeText(detailModalTarget.raw_text);
                        setDetailCopied(true);
                        setTimeout(() => setDetailCopied(false), 2000);
                      }
                    }}
                    className="text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-surface border border-border-hairline transition-colors"
                  >
                    {detailCopied ? (
                      <Check className="w-3 h-3 text-status-completed" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{detailCopied ? "Tersalin" : "Salin Teks"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-md bg-bg-surface border border-border-subtle text-body-sm text-text-primary whitespace-pre-line leading-relaxed font-sans max-h-56 overflow-y-auto select-text">
                  {detailModalTarget.raw_text}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-border-hairline flex flex-wrap items-center justify-between gap-2 shrink-0">
              <a
                href={detailModalTarget.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-link-teal/15 text-link-teal hover:bg-link-teal/25 border border-link-teal/30 text-caption font-semibold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buka Postingan di Telegram</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <div className="flex items-center gap-2">
                <ButtonSecondary type="button" onClick={() => setDetailModalTarget(null)}>
                  Tutup
                </ButtonSecondary>
                {detailModalTarget.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => {
                      const t = detailModalTarget;
                      setDetailModalTarget(null);
                      handleOpenJoinModal(t);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent text-on-accent hover:bg-accent-pressed text-caption font-semibold transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tandai Sudah Join</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* REVIEW & BUAT PROYEK MODAL                               */}
      {/* ======================================================== */}
      <ProjectReviewModal
        isOpen={Boolean(reviewingWaitlist)}
        onClose={() => setReviewingWaitlist(null)}
        source="waitlist"
        waitlistItem={reviewingWaitlist}
        onSuccess={(newProjectId) => {
          setReviewingWaitlist(null);
          reloadData();
          router.push(`/projects/${newProjectId}`);
        }}
      />
    </div>
  );
}
