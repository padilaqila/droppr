import Link from "next/link";
import { CardDashboardStat, CardBase } from "@/components/ui/card";
import { ButtonPrimary } from "@/components/ui/button";
import { FolderGit2, CheckSquare, Clock, Plus, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch projects of authenticated user (filtered automatically by RLS)
  const { data: rawProjects } = await supabase.from("projects").select("*");
  const projects = (rawProjects as Project[]) || [];

  // Fetch tasks of authenticated user
  const { data: rawTasks } = await supabase.from("tasks").select("*");
  const tasks = (rawTasks as Task[]) || [];

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "in_progress").length;
  const readyClaimProjects = projects.filter((p) => p.status === "ready_to_claim").length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.due_date &&
      new Date(t.due_date).getTime() < Date.now()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            Dashboard
          </h1>
          <p className="text-body-sm text-text-secondary">
            Ringkasan progres aktivitas airdrop dan tugas harianmu.
          </p>
        </div>
        <div>
          <Link href="/projects">
            <ButtonPrimary className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Project</span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* Real Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Total Project</span>
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {totalProjects}
          </div>
          <div className="text-caption text-text-tertiary mt-1">
            <span className="text-link-teal">{activeProjects}</span> aktif dikerjakan
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Task Hari Ini</span>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="text-heading-2 font-bold text-text-primary">
            {totalTasks}
          </div>
          <div className="text-caption text-text-tertiary mt-1">
            {completedTasks} selesai
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Siap Klaim</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-heading-2 font-bold text-accent">
            {readyClaimProjects}
          </div>
          <div className="text-caption text-text-tertiary mt-1">
            {readyClaimProjects > 0
              ? "Snapshot terkonfirmasi"
              : "Belum ada yang siap klaim"}
          </div>
        </CardDashboardStat>

        <CardDashboardStat>
          <div className="flex items-center justify-between text-text-tertiary mb-2">
            <span className="text-caption font-medium">Overdue</span>
            <Clock className="w-4 h-4 text-status-overdue" />
          </div>
          <div className="text-heading-2 font-bold text-status-overdue">
            {overdueTasks}
          </div>
          <div className="text-caption text-text-tertiary mt-1">
            {overdueTasks > 0
              ? `${overdueTasks} deadline terlewat`
              : "Tidak ada deadline terlewat"}
          </div>
        </CardDashboardStat>
      </div>

      {/* Task Hari Ini Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-app-section-title font-semibold text-text-primary">
            Task Hari Ini
          </h2>
          <Link
            href="/tasks"
            className="text-caption text-link-teal hover:underline inline-flex items-center gap-1"
          >
            <span>Semua task</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {totalTasks === 0 ? (
          <CardBase className="text-center py-10 space-y-3">
            <p className="text-body-md text-text-secondary max-w-md mx-auto">
              Belum ada task hari ini. Tambah project pertamamu untuk mulai melacak.
            </p>
            <Link href="/projects">
              <ButtonPrimary className="inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Tambah Project Pertama</span>
              </ButtonPrimary>
            </Link>
          </CardBase>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-md bg-bg-elevated border border-border-hairline flex items-center justify-between"
              >
                <span className="text-body-sm text-text-primary">{task.title}</span>
                <span className="text-caption font-mono text-text-tertiary uppercase">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
