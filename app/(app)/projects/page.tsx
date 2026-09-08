import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ProjectsClientView } from "./projects-client-view";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type FolderType = Database["public"]["Tables"]["folders"]["Row"];

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: rawProjects }, { data: rawFolders }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, user_id, folder_id, name, chain, status, logo_url, created_at, updated_at, social_links, guide_content")
      .order("created_at", { ascending: false }),
    supabase
      .from("folders")
      .select("id, user_id, name, created_at, updated_at")
      .order("name", { ascending: true }),
  ]);

  const projectList = (rawProjects as Project[]) || [];
  const folderList = (rawFolders as FolderType[]) || [];

  return (
    <ProjectsClientView
      initialProjects={projectList}
      initialFolders={folderList}
    />
  );
}
