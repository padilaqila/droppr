import { CardDashboardStat, CardBase } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ButtonPrimary } from "@/components/ui/button";
import { FolderGit2, CheckSquare, Clock, Plus, Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">Dashboard</h1>
          <p className="text-body-sm text-text-secondary">
            Ringkasan progres aktivitas airdrop dan tugas harianmu.
          </p>
        </div>
        <div>
          <ButtonPrimary className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Tambah Project</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Total Project</span>
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">12</div>
          <div className="text-caption text-text-tertiary mt-1">
            <span className="text-link-teal">3</span> aktif dikerjakan
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Task Hari Ini</span>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">5</div>
          <div className="text-caption text-text-tertiary mt-1">2 selesai</div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Siap Klaim</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-accent">1</div>
          <div className="text-caption text-text-tertiary mt-1">Snapshot terkonfirmasi</div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Overdue</span>
            <Clock className="w-4 h-4 text-status-overdue" />
          </div>
          <div className="text-heading-2 font-bold text-status-overdue">0</div>
          <div className="text-caption text-text-tertiary mt-1">Tidak ada deadline terlewat</div>
        </CardDashboardStat>
      </div>

      {/* Status Badges Preview (Reference Component) */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Status Referensi Proyek
        </h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="not-started" />
          <StatusBadge status="in-progress" />
          <StatusBadge status="waiting" />
          <StatusBadge status="ready-claim" />
          <StatusBadge status="completed" />
          <StatusBadge status="overdue" />
        </div>
      </CardBase>

      {/* Task Hari Ini Section */}
      <div className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Task Hari Ini
        </h2>
        <CardBase className="text-center py-10 space-y-3">
          <p className="text-body-md text-text-secondary max-w-md mx-auto">
            Belum ada task hari ini. Tambah project pertamamu untuk mulai melacak.
          </p>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Project Pertama</span>
          </ButtonPrimary>
        </CardBase>
      </div>
    </div>
  );
}
