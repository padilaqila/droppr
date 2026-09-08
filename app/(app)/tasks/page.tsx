import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { TasksClientView } from "./tasks-client-view";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function TasksPage() {
  const supabase = await createClient();

  // Fetch all projects and tasks in parallel
  const [{ data: rawProjects }, { data: rawTasks }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const projects = (rawProjects as Project[]) || [];
  const tasks = (rawTasks as Task[]) || [];

  return (
    <TasksClientView
      initialProjects={projects}
      initialTasks={tasks}
    />
  );
}
