import { createClient } from "./client";

/**
 * Checks whether a project is marked as high-priority.
 * Stored in `social_links.is_priority` (boolean).
 */
export function isProjectPriority(project: any): boolean {
  if (!project) return false;
  const social = (project.social_links as Record<string, any>) || {};
  return Boolean(social.is_priority);
}

/**
 * Toggles a project's priority status in Supabase.
 * Returns the new priority status (true = high priority, false = normal).
 */
export async function toggleProjectPriority(
  projectId: string,
  currentStatus: boolean
): Promise<boolean> {
  const nextStatus = !currentStatus;
  const supabase = createClient();

  // 1. Fetch current social_links to avoid overwriting other keys
  const { data: currentProj, error: fetchError } = await (supabase as any)
    .from("projects")
    .select("social_links")
    .eq("id", projectId)
    .single();

  if (fetchError) {
    console.error("Failed to fetch project for priority toggle:", fetchError);
    throw fetchError;
  }

  const existingSocial = (currentProj?.social_links as Record<string, any>) || {};
  const updatedSocial = {
    ...existingSocial,
    is_priority: nextStatus,
  };

  // 2. Persist updated metadata
  const { error: updateError } = await (supabase as any)
    .from("projects")
    .update({
      social_links: updatedSocial,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) {
    console.error("Failed to update project priority in database:", updateError);
    throw updateError;
  }

  return nextStatus;
}
