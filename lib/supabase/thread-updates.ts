import { createClient } from "@/lib/supabase/client";

export interface ThreadItem {
  id: string;
  project_id: string;
  type: "task" | "news" | "milestone";
  title: string;
  content?: string | null;
  source_url?: string | null;
  source_date?: string | null;
  status: "pending" | "done" | "info";
  completed_at?: string | null;
  created_at: string;
}

export function cleanHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#036;/g, "$")
    .replace(/&#36;/g, "$")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Sanitize strings to avoid PostgreSQL invalid JSON surrogate error (22P02)
 * Removes unpaired high/low surrogates and null characters.
 */
export function sanitizeSurrogates(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\0/g, "");
}

/**
 * Recursively sanitize all strings in an object/array to ensure safe JSONB insertion into Postgres
 */
export function sanitizeJsonObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeSurrogates(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonObject);
  }
  if (obj !== null && typeof obj === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      res[key] = sanitizeJsonObject(obj[key]);
    }
    return res;
  }
  return obj;
}

/**
 * Fetch thread items for a project (Matching actual public.project_updates table)
 */
export async function fetchProjectThreads(projectId: string): Promise<ThreadItem[]> {
  const supabase = createClient() as any;

  // 1. Try dedicated table first
  try {
    const { data, error } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const mapped: ThreadItem[] = data.map((row: any) => {
        const cleanedRaw = cleanHtmlEntities(row.content || "");
        const lines = cleanedRaw.split("\n").filter((l: string) => l.trim().length > 0);
        const title = lines[0] || "Update Proyek";

        return {
          id: String(row.id),
          project_id: row.project_id,
          type: (row.type === "task" ? "task" : "news") as "task" | "news",
          title: title,
          content: cleanedRaw || null,
          source_url: row.source_url || null,
          source_date: row.created_at,
          status: (row.is_completed ? "done" : (row.type === "task" ? "pending" : "info")) as "pending" | "done" | "info",
          completed_at: row.is_completed ? row.updated_at : null,
          created_at: row.created_at,
        };
      });

      if (mapped.length > 0) {
        return mapped;
      }
    }
  } catch (err) {
    console.error("fetchProjectThreads from table error:", err);
  }

  // 2. Fallback: Read from projects.social_links.thread_updates
  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    const socialLinks = projData?.social_links || {};
    const threadUpdates = Array.isArray(socialLinks.thread_updates)
      ? socialLinks.thread_updates
      : [];

    return threadUpdates as ThreadItem[];
  } catch (err) {
    console.error("Failed to fetch project thread updates:", err);
    return [];
  }
}

/**
 * Create a new thread item for a project (Inserting into actual public.project_updates table)
 */
export async function createProjectThread(
  projectId: string,
  item: Omit<ThreadItem, "id" | "created_at">
): Promise<ThreadItem> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullContent = item.content?.trim()
    ? (item.content.includes(item.title) ? item.content.trim() : `${item.title}\n\n${item.content}`.trim())
    : item.title.trim();
  const nowIso = new Date().toISOString();
  const createdAt = item.source_date || nowIso;

  const newItem: ThreadItem = {
    ...item,
    id: "th-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    project_id: projectId,
    content: fullContent,
    created_at: createdAt,
  };

  // 1. Insert into dedicated table public.project_updates
  if (user) {
    try {
      const { data, error } = await supabase
        .from("project_updates")
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: item.type === "task" ? "task" : "news",
          content: fullContent,
          is_completed: item.status === "done",
          source_url: item.source_url || null,
          source_platform: item.source_url?.includes("t.me") ? "telegram" : "manual",
          created_at: createdAt,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: String(data.id),
          project_id: data.project_id,
          type: data.type === "task" ? "task" : "news",
          title: item.title,
          content: fullContent,
          source_url: data.source_url,
          source_date: data.created_at,
          status: data.is_completed ? "done" : (data.type === "task" ? "pending" : "info"),
          completed_at: data.is_completed ? data.updated_at : null,
          created_at: data.created_at,
        };
      } else if (error) {
        console.error("Insert into project_updates error:", error);
      }
    } catch (err) {
      console.error("Insert into project_updates exception:", err);
    }
  }

  // 2. Fallback: Save to projects.social_links.thread_updates
  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    const socialLinks = (projData?.social_links as Record<string, any>) || {};
    const existing = Array.isArray(socialLinks.thread_updates)
      ? socialLinks.thread_updates
      : [];

    const updatedList = [newItem, ...existing];

    await supabase
      .from("projects")
      .update({
        social_links: {
          ...socialLinks,
          thread_updates: updatedList,
        },
        updated_at: nowIso,
      })
      .eq("id", projectId);
  } catch (err) {
    console.error("Fallback insert thread error:", err);
  }

  return newItem;
}

/**
 * Bulk create multiple thread items for a project
 */
export async function bulkCreateProjectThreads(
  projectId: string,
  items: Omit<ThreadItem, "id" | "created_at">[]
): Promise<ThreadItem[]> {
  if (!items || items.length === 0) return [];
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();

  // 1. Try dedicated table first
  if (user) {
    try {
      const rows = items.map((it) => {
        const fullContent = it.title + (it.content && it.content !== it.title ? `\n\n${it.content}` : "");
        const createdAt = it.source_date || nowIso;
        return {
          project_id: projectId,
          user_id: user.id,
          type: it.type === "task" ? "task" : "news",
          content: fullContent.trim(),
          is_completed: it.status === "done",
          source_url: it.source_url || null,
          source_platform: it.source_url?.includes("t.me") ? "telegram" : "manual",
          created_at: createdAt,
          updated_at: nowIso,
        };
      });

      const { data, error } = await supabase
        .from("project_updates")
        .insert(rows)
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => {
          const lines = (row.content || "").split("\n").filter((l: string) => l.trim().length > 0);
          return {
            id: String(row.id),
            project_id: row.project_id,
            type: (row.type === "task" ? "task" : "news") as "task" | "news",
            title: lines[0] || "Update Proyek",
            content: lines.slice(1).join("\n").trim() || null,
            source_url: row.source_url,
            source_date: row.created_at,
            status: (row.is_completed ? "done" : (row.type === "task" ? "pending" : "info")) as "pending" | "done" | "info",
            completed_at: row.is_completed ? row.updated_at : null,
            created_at: row.created_at,
          };
        });
      } else if (error) {
        console.error("Bulk insert into project_updates error:", error);
      }
    } catch (err) {
      console.error("Bulk insert into project_updates exception:", err);
    }
  }

  // 2. Fallback: Save to projects.social_links.thread_updates
  const createdItems: ThreadItem[] = items.map((it, idx) => ({
    ...it,
    id: "th-" + (Date.now() + idx) + "-" + Math.random().toString(36).substring(2, 6),
    project_id: projectId,
    created_at: it.source_date || nowIso,
  }));

  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    const socialLinks = (projData?.social_links as Record<string, any>) || {};
    const existing = Array.isArray(socialLinks.thread_updates)
      ? socialLinks.thread_updates
      : [];

    const updatedList = [...createdItems, ...existing];

    await supabase
      .from("projects")
      .update({
        social_links: {
          ...socialLinks,
          thread_updates: updatedList,
        },
        updated_at: nowIso,
      })
      .eq("id", projectId);
  } catch (err) {
    console.error("Fallback bulk insert thread error:", err);
  }

  return createdItems;
}

/**
 * Toggle task item status in thread
 */
export async function toggleThreadTaskStatus(
  projectId: string,
  threadId: string,
  nextStatus: "pending" | "done"
): Promise<void> {
  const supabase = createClient() as any;
  const isCompleted = nextStatus === "done";
  const nowIso = new Date().toISOString();

  // Try dedicated table
  try {
    const { error } = await supabase
      .from("project_updates")
      .update({
        is_completed: isCompleted,
        updated_at: nowIso,
      })
      .eq("id", threadId);

    if (!error) return;
  } catch {
    // Fall through
  }

  // Fallback: Update in projects.social_links
  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    const socialLinks = (projData?.social_links as Record<string, any>) || {};
    const existing: ThreadItem[] = Array.isArray(socialLinks.thread_updates)
      ? socialLinks.thread_updates
      : [];

    const updatedList = existing.map((t) =>
      t.id === threadId ? { ...t, status: nextStatus, completed_at: isCompleted ? nowIso : null } : t
    );

    await supabase
      .from("projects")
      .update({
        social_links: { ...socialLinks, thread_updates: updatedList },
        updated_at: nowIso,
      })
      .eq("id", projectId);
  } catch (err) {
    console.error("Fallback toggle thread error:", err);
  }
}

/**
 * Delete a thread item
 */
export async function deleteProjectThread(
  projectId: string,
  threadId: string
): Promise<void> {
  const supabase = createClient() as any;

  // 1. Delete from dedicated table
  try {
    const { error } = await supabase
      .from("project_updates")
      .delete()
      .eq("id", threadId);

    if (error) {
      console.warn("Delete from project_updates error:", error);
    }
  } catch (err) {
    console.error("Delete from project_updates exception:", err);
  }

  // 2. ALWAYS also purge from projects.social_links.thread_updates (fallback / legacy storage)
  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("social_links")
      .eq("id", projectId)
      .single();

    const socialLinks = (projData?.social_links as Record<string, any>) || {};
    const existing: ThreadItem[] = Array.isArray(socialLinks.thread_updates)
      ? socialLinks.thread_updates
      : [];

    const updatedList = existing.filter((t) => t.id !== threadId);

    if (existing.length !== updatedList.length) {
      await supabase
        .from("projects")
        .update({
          social_links: { ...socialLinks, thread_updates: updatedList },
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
    }
  } catch (err) {
    console.error("Fallback delete thread error:", err);
  }
}
