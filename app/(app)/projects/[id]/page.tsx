import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { ButtonPrimary } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ProjectDetailClientView } from "./project-detail-client";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

interface ProjectDetail extends ProjectRow {
  tasks?: TaskRow[];
  accounts?: AccountRow[];
  wallets?: WalletRow[];
  reminders?: ReminderRow[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  const supabase = await createClient();

  // Fetch project by id with tasks, accounts, joined wallets, and reminders
  const { data: rawProject } = await (supabase as any)
    .from("projects")
    .select("*, tasks(*), accounts(*), project_wallets(wallets(*)), reminders(*)")
    .eq("id", projectId)
    .single();

  if (!rawProject) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke daftar project</span>
        </Link>
        <CardBase className="text-center py-12 space-y-3">
          <h2 className="text-heading-3 font-semibold text-text-primary">
            Project tidak ditemukan
          </h2>
          <p className="text-body-sm text-text-secondary max-w-md mx-auto">
            Project ini belum ada atau Anda tidak memiliki akses ke project ini.
          </p>
          <div className="pt-2">
            <Link href="/projects">
              <ButtonPrimary>Lihat Semua Project</ButtonPrimary>
            </Link>
          </div>
        </CardBase>
      </div>
    );
  }

  // Flatten joined wallets
  const wallets: WalletRow[] = (rawProject.project_wallets || [])
    .map((pw: any) => pw.wallets)
    .filter(Boolean);

  const project: ProjectDetail = {
    ...rawProject,
    wallets,
  };

  return <ProjectDetailClientView project={project} />;
}
