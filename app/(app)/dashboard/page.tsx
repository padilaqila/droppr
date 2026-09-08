import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { DashboardClientView, type EnrichedReminder } from "./dashboard-client-view";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch projects, tasks, and reminders in parallel to minimize latency
  const [
    { data: rawProjects },
    { data: rawTasks },
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
    (supabase as any)
      .from("reminders")
      .select("*, projects(id, name, chain), tasks(id, title)")
      .order("next_trigger_at", { ascending: true }),
  ]);

  const projects = (rawProjects as Project[]) || [];
  const tasks = (rawTasks as Task[]) || [];
  const reminders: EnrichedReminder[] = rawReminders || [];

  return (
    <DashboardClientView
      initialProjects={projects}
      initialTasks={tasks}
      initialReminders={reminders}
    />
  );
}
