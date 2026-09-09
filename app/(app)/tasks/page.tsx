import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { TasksClientView } from "./tasks-client-view";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function TasksPage() {
  const supabase = await createClient();

  // Fetch all projects, tasks, project_updates, and reminders in parallel
  const [
    { data: rawProjects },
    { data: rawTasks },
    { data: rawUpdates },
    { data: rawReminders },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("project_updates")
      .select("*")
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("reminders")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const projects = (rawProjects as Project[]) || [];
  const tasks = (rawTasks as Task[]) || [];
  const updates = (rawUpdates as any[]) || [];
  const reminders = (rawReminders as any[]) || [];

  return (
    <TasksClientView
      initialProjects={projects}
      initialTasks={tasks}
      initialUpdates={updates}
      initialReminders={reminders}
    />
  );
}
