import Link from "next/link";
import { CardBase } from "@/components/ui/card";
import { StatusBadge, type ProjectStatus } from "@/components/ui/status-badge";
import { ButtonSecondary, ButtonPrimary } from "@/components/ui/button";
import { ArrowLeft, Plus, Globe, Send, ExternalLink, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

interface ProjectDetail extends ProjectRow {
  tasks?: TaskRow[];
  accounts?: AccountRow[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  const supabase = await createClient();

  // Fetch project by id for the current user
  const { data: rawProject } = await supabase
    .from("projects")
    .select("*, tasks(*), accounts(*)")
    .eq("id", projectId)
    .single();

  const project = rawProject as unknown as ProjectDetail | null;

  if (!project) {
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

  const badgeStatus = (project.status.replace("_", "-") as ProjectStatus);
  const socialLinks = (project.social_links as Record<string, string>) || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke daftar project</span>
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-1 font-semibold text-text-primary">
              {project.name}
            </h1>
            <StatusBadge status={badgeStatus} />
          </div>
          <p className="text-body-sm text-text-secondary font-mono mt-1">
            Chain: {project.chain || "Belum ditentukan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonSecondary>Edit Project</ButtonSecondary>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Task</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Section 1: Social Links */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Link Sosial & Dokumen
        </h2>
        {Object.keys(socialLinks).length > 0 ? (
          <div className="flex flex-wrap gap-2 text-body-sm">
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <Globe className="w-3.5 h-3.5" /> Twitter / X
              </a>
            )}
            {socialLinks.discord && (
              <a
                href={socialLinks.discord}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <Send className="w-3.5 h-3.5" /> Discord
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated-2 text-link-teal hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Website
              </a>
            )}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada link sosial yang disimpan.
          </p>
        )}
      </CardBase>

      {/* Section 2: Panduan Kerja (Guide) */}
      <CardBase className="space-y-3">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Panduan Kerja (Guide)
        </h2>
        {project.guide_content ? (
          <div className="p-4 rounded-md bg-bg-elevated-2 text-body-sm text-text-secondary whitespace-pre-wrap">
            {project.guide_content}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada catatan atau panduan kerja untuk project ini.
          </p>
        )}
      </CardBase>

      {/* Section 3: Task List */}
      <CardBase className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-app-section-title font-semibold text-text-primary">
            Daftar Task
          </h2>
          <ButtonSecondary className="!py-1 !px-2.5 text-caption">
            + Task
          </ButtonSecondary>
        </div>
        {project.tasks && project.tasks.length > 0 ? (
          <div className="space-y-2">
            {project.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-md bg-bg-elevated-2 border border-border-hairline flex items-center justify-between"
              >
                <span className="text-body-sm text-text-primary">{task.title}</span>
                <span className="text-caption font-mono text-text-tertiary uppercase">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada task yang dibuat untuk project ini.
          </p>
        )}
      </CardBase>

      {/* Section 4: Akun Terkait (Non-sensitif) */}
      <CardBase className="space-y-2">
        <div className="flex items-center gap-2 text-caption text-text-tertiary">
          <ShieldAlert className="w-3.5 h-3.5 text-accent" />
          <span>Akun non-sensitif (Droppr tidak pernah menyimpan password)</span>
        </div>
        {project.accounts && project.accounts.length > 0 ? (
          <div className="space-y-2 pt-1">
            {project.accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-md bg-bg-elevated-2 text-body-sm flex items-center justify-between"
              >
                <span className="text-text-secondary">{acc.label}:</span>
                <span className="text-text-primary font-mono">{acc.username_email}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-text-tertiary">
            Belum ada akun terkait yang disimpan.
          </p>
        )}
      </CardBase>
    </div>
  );
}
