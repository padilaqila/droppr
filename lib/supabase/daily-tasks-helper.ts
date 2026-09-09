import { createClient } from "@/lib/supabase/client";

/**
 * Returns the Date of the most recent daily reset (00:00 UTC / 07:00 WIB).
 */
export function getLastDailyResetTime(): Date {
  const now = new Date();
  const reset = new Date();
  reset.setUTCHours(0, 0, 0, 0);

  // If current time is earlier than 00:00 UTC today, the last reset occurred yesterday at 00:00 UTC
  if (now.getTime() < reset.getTime()) {
    reset.setUTCDate(reset.getUTCDate() - 1);
  }
  return reset;
}

/**
 * Returns the Date of the upcoming daily reset (next 00:00 UTC / 07:00 WIB).
 */
export function getNextDailyResetTime(): Date {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return reset;
}

/**
 * Checks if a project's daily task is completed for the current day cycle.
 */
export function isProjectDailyDone(
  project: { social_links?: Record<string, any> | any },
  projectTasks?: Array<{ status: string; completed_at?: string | null; updated_at?: string | null }>
): boolean {
  if (!project) return false;
  const lastReset = getLastDailyResetTime();
  const rawSocial = (project.social_links as Record<string, any>) || {};

  // 1. Direct project metadata: last_daily_completed_at
  if (rawSocial.last_daily_completed_at) {
    const completedDate = new Date(rawSocial.last_daily_completed_at);
    if (!isNaN(completedDate.getTime()) && completedDate >= lastReset) {
      return true;
    }
  }

  // 2. Associated tasks (if any): all tasks are 'done' and completed/updated after lastReset
  if (projectTasks && projectTasks.length > 0) {
    const allDone = projectTasks.every((t) => t.status === "done");
    const anyCompletedRecently = projectTasks.some((t) => {
      const timeStr = t.completed_at || t.updated_at;
      if (!timeStr) return false;
      const d = new Date(timeStr);
      return !isNaN(d.getTime()) && d >= lastReset;
    });
    if (allDone && anyCompletedRecently) {
      return true;
    }
  }

  return false;
}

/**
 * Toggle or set daily task completion status for a project.
 * Synchronizes both `projects.social_links.last_daily_completed_at` and `tasks` table.
 */
export async function toggleProjectDailyTask(
  projectId: string,
  targetCompleted: boolean
): Promise<{ success: boolean; completedAt: string | null; error?: any }> {
  try {
    const supabase = createClient() as any;
    const nowIso = targetCompleted ? new Date().toISOString() : null;

    // 1. Fetch current project social_links to preserve existing links
    const { data: projData, error: fetchErr } = await supabase
      .from("projects")
      .select("social_links, status")
      .eq("id", projectId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentSocial = (projData?.social_links as Record<string, any>) || {};
    const updatedSocial: Record<string, any> = {
      ...currentSocial,
      last_daily_completed_at: nowIso,
    };

    // If unmarking, remove property to keep JSON clean
    if (!nowIso) {
      delete updatedSocial.last_daily_completed_at;
    }

    // 2. Update projects metadata (DO NOT touch project lifecycle status unless it was not_started)
    const updatePayload: Record<string, any> = {
      social_links: updatedSocial,
      updated_at: new Date().toISOString(),
    };

    // If starting a project for the first time, move from not_started to in_progress
    if (targetCompleted && projData?.status === "not_started") {
      updatePayload.status = "in_progress";
    }

    const { error: projUpdateErr } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId);

    if (projUpdateErr) throw projUpdateErr;

    // 3. Synchronize tasks table (if any tasks exist for this project)
    if (targetCompleted) {
      await supabase
        .from("tasks")
        .update({
          status: "done",
          completed_at: nowIso,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
    } else {
      await supabase
        .from("tasks")
        .update({
          status: "pending",
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
    }

    return { success: true, completedAt: nowIso };
  } catch (err: any) {
    console.error("toggleProjectDailyTask error:", err);
    return { success: false, completedAt: null, error: err };
  }
}

/**
 * Update project task routine type ("daily" | "weekly" | "one_time" | "recurring").
 */
export async function updateProjectTaskType(
  projectId: string,
  taskType: "daily" | "weekly" | "one_time" | "recurring"
): Promise<{ success: boolean; taskType: "daily" | "weekly" | "one_time" | "recurring"; error?: any }> {
  try {
    const supabase = createClient() as any;
    const { data: projData, error: fetchErr } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentSocial = (projData?.social_links as Record<string, any>) || {};
    const updatedSocial = {
      ...currentSocial,
      task_type: taskType,
    };

    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        social_links: updatedSocial,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateErr) throw updateErr;

    return { success: true, taskType };
  } catch (err: any) {
    console.error("updateProjectTaskType error:", err);
    return { success: false, taskType, error: err };
  }
}

/**
 * Update project lifecycle status and optional claim portal URL.
 */
export async function updateProjectLifecycleStatus(
  projectId: string,
  status: "not_started" | "in_progress" | "waiting" | "ready_to_claim" | "completed",
  claimUrl?: string | null
): Promise<{ success: boolean; status: string; error?: any }> {
  try {
    const supabase = createClient() as any;
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (claimUrl !== undefined) {
      const { data: projData } = await supabase
        .from("projects")
        .select("social_links")
        .eq("id", projectId)
        .single();

      const currentSocial = (projData?.social_links as Record<string, any>) || {};
      const updatedSocial = { ...currentSocial };
      if (claimUrl && claimUrl.trim()) {
        updatedSocial.claim_url = claimUrl.trim();
      } else if (claimUrl === null || claimUrl === "") {
        delete updatedSocial.claim_url;
      }
      updatePayload.social_links = updatedSocial;
    }

    const { error: updateErr } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId);

    if (updateErr) throw updateErr;

    return { success: true, status };
  } catch (err: any) {
    console.error("updateProjectLifecycleStatus error:", err);
    return { success: false, status, error: err };
  }
}

