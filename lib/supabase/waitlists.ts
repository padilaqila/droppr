import { createClient } from "@/lib/supabase/client";
import { cleanHtmlEntities, sanitizeSurrogates, sanitizeJsonObject } from "./thread-updates";
import { cleanDuplicateLinks } from "@/lib/utils/clean-links";

export interface WaitlistItem {
  id: string;
  project_name: string;
  title: string;
  summary?: string | null;
  channel: "dutacryptoairdrop" | "airdropfind" | "manual";
  source_url: string;
  raw_text: string;
  status: "pending" | "joined";
  registered_account?: string | null;
  ref_link?: string | null;
  tasks: string[];
  joined_at?: string | null;
  created_at: string;
  expires_at?: string;
}

/**
 * Fetch all waitlist items within 90 days active range
 */
export async function fetchWaitlists(): Promise<WaitlistItem[]> {
  const supabase = createClient() as any;
  const nowIso = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("waitlists")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: String(row.id),
        project_name: cleanHtmlEntities(row.project_name),
        title: cleanHtmlEntities(row.title),
        summary: row.summary ? cleanDuplicateLinks(cleanHtmlEntities(row.summary)) : null,
        channel: row.channel,
        source_url: row.source_url,
        raw_text: cleanDuplicateLinks(cleanHtmlEntities(row.raw_text)),
        status: row.status as "pending" | "joined",
        registered_account: row.registered_account,
        ref_link: row.ref_link ? cleanDuplicateLinks(row.ref_link) : null,
        tasks: Array.isArray(row.tasks) ? row.tasks.map((t: string) => cleanDuplicateLinks(cleanHtmlEntities(t))) : [],
        joined_at: row.joined_at,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
    }
  } catch (err) {
    console.error("fetchWaitlists error:", err);
  }

  return [];
}

/**
 * Update waitlist joined status and registered account info
 */
export async function updateWaitlistStatus(
  waitlistId: string,
  status: "pending" | "joined",
  registeredAccount?: string,
  refLink?: string
): Promise<boolean> {
  const supabase = createClient() as any;
  const nowIso = new Date().toISOString();

  try {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: nowIso,
    };

    if (status === "joined") {
      updatePayload.joined_at = nowIso;
      if (registeredAccount !== undefined) updatePayload.registered_account = registeredAccount;
      if (refLink !== undefined) updatePayload.ref_link = refLink;
    } else {
      updatePayload.joined_at = null;
    }

    const { error } = await supabase
      .from("waitlists")
      .update(updatePayload)
      .eq("id", waitlistId);

    return !error;
  } catch (err) {
    console.error("updateWaitlistStatus error:", err);
    return false;
  }
}

/**
 * Delete waitlist item
 */
export async function deleteWaitlist(waitlistId: string): Promise<boolean> {
  const supabase = createClient() as any;

  try {
    const { error } = await supabase
      .from("waitlists")
      .delete()
      .eq("id", waitlistId);

    return !error;
  } catch (err) {
    console.error("deleteWaitlist error:", err);
    return false;
  }
}

import { parseAirdropProjectData, parseResourceLinks, detectChain } from "./airdrop-parser";

/**
 * Convert a waitlist into an official Droppr Project
 */
export async function convertWaitlistToProject(waitlist: WaitlistItem): Promise<string | null> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    // 1. Comprehensive Zero-Token Link & Content Parsing
    const parsed = parseAirdropProjectData(
      waitlist.project_name || waitlist.title,
      waitlist.raw_text,
      {
        sourceUrl: waitlist.source_url,
        refLink: waitlist.ref_link,
        accountNote: waitlist.registered_account,
        existingTasks: waitlist.tasks,
      }
    );

    // Initial status: if joined, mark as waiting (waiting for TGE/snapshot); otherwise not_started
    const initialStatus = waitlist.status === "joined" ? "waiting" : "not_started";

    const safeName =
      sanitizeSurrogates(parsed.name).trim() ||
      sanitizeSurrogates(waitlist.project_name || waitlist.title).trim() ||
      "Waitlist Project";
    const safeChain = sanitizeSurrogates(parsed.chain).trim() || "Multi-chain";
    const safeGuideContent = sanitizeSurrogates(parsed.guide_content);
    const safeSocialLinks = sanitizeJsonObject(parsed.social_links || {});

    // 2. Insert into projects table
    const { data: projectData, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: safeName,
        chain: safeChain,
        status: initialStatus,
        social_links: safeSocialLinks,
        guide_content: safeGuideContent,
      })
      .select("id")
      .single();

    if (projErr || !projectData) {
      throw projErr || new Error("Gagal membuat project dari waitlist.");
    }

    const projectId = projectData.id;

    // 3. Insert tasks with proper type and status
    if (parsed.tasks && parsed.tasks.length > 0) {
      const taskRows = parsed.tasks
        .map((taskItem) => ({
          project_id: projectId,
          title: sanitizeSurrogates(taskItem.title).trim(),
          type: taskItem.type,
          status: waitlist.status === "joined" ? ("done" as const) : ("pending" as const),
        }))
        .filter((t) => t.title.length > 0);

      if (taskRows.length > 0) {
        await supabase.from("tasks").insert(taskRows);
      }
    }

    return projectId;
  } catch (err) {
    console.error("convertWaitlistToProject error:", err);
    return null;
  }
}

/**
 * Convert a waitlist into an official Droppr Project using SumoPod AI
 * Parses chain, social links, and organized tasks. Automatically falls back to standard conversion if AI fails.
 */
export async function convertWaitlistToProjectWithAI(waitlist: WaitlistItem): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/parse-airdrop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: waitlist.raw_text }),
    });

    if (!res.ok) {
      console.warn("AI parse-airdrop failed for waitlist, falling back to standard converter");
      return convertWaitlistToProject(waitlist);
    }

    const resJson = await res.json();
    const aiData = resJson.data;

    if (!aiData || !aiData.name) {
      return convertWaitlistToProject(waitlist);
    }

    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const socialLinks = {
      ...(aiData.social_links || {}),
      telegram: waitlist.source_url,
      telegram_post_url: waitlist.source_url,
      ref_link: waitlist.ref_link || null,
    };

    const { data: projectData, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: cleanHtmlEntities(aiData.name || waitlist.project_name),
        chain: cleanHtmlEntities(aiData.chain || "Multi-chain"),
        status: "waiting",
        social_links: socialLinks,
        guide_content: `Catatan Akun Terdaftar: ${waitlist.registered_account || "Belum dicatat"}\n\n${cleanHtmlEntities(aiData.guide_content || waitlist.raw_text)}`,
      })
      .select("id")
      .single();

    if (projErr || !projectData) {
      return convertWaitlistToProject(waitlist);
    }

    const projectId = projectData.id;

    // Insert tasks
    const tasksToInsert: any[] = [];
    if (Array.isArray(aiData.tasks) && aiData.tasks.length > 0) {
      for (const t of aiData.tasks) {
        if (t && t.title) {
          tasksToInsert.push({
            project_id: projectId,
            title: cleanHtmlEntities(t.title),
            type: t.type === "daily" ? "daily" : "one_time",
            status: "pending",
          });
        }
      }
    } else if (waitlist.tasks && waitlist.tasks.length > 0) {
      for (const t of waitlist.tasks) {
        tasksToInsert.push({
          project_id: projectId,
          title: cleanHtmlEntities(t),
          type: "one_time",
          status: waitlist.status === "joined" ? "done" : "pending",
        });
      }
    }

    if (tasksToInsert.length > 0) {
      await supabase.from("tasks").insert(tasksToInsert);
    }

    return projectId;
  } catch (err) {
    console.error("convertWaitlistToProjectWithAI error:", err);
    return convertWaitlistToProject(waitlist);
  }
}

/**
 * Extract task instructions from any update text automatically
 */
export function extractTasksFromText(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tasks: string[] = [];

  lines.forEach((line) => {
    // Detect bullets, numbered steps, or action emojis
    if (/^[-➖•*👉➡️✓✔✅\d+\.]\s*/.test(line)) {
      const clean = line.replace(/^[-➖•*👉➡️✓✔✅\d+\.]\s*/, "").trim();
      if (clean.length > 3 && !clean.startsWith("http")) {
        tasks.push(clean);
      }
    } else if (
      /(?:claim|faucet|connect|swap|bridge|stake|mint|vote|complete|submit|register|download|follow|join|testnet|task)\s+/i.test(
        line
      )
    ) {
      if (line.length > 4 && line.length < 120 && !line.startsWith("http")) {
        tasks.push(line);
      }
    }
  });

  return tasks.length > 0 ? tasks.slice(0, 10) : [lines[0]?.slice(0, 100) || "Tugas Airdrop Lanjutan"];
}

export interface TransferTasksPayload {
  projectName: string;
  sourceUrl?: string;
  rawText?: string;
  tasks: string[];
  existingProjectId?: string;
  registeredAccount?: string;
  refLink?: string;
  taskType?: "one_time" | "daily";
}

/**
 * Transfer tasks from waitlist updates directly into an official project's task list
 */
export async function transferWaitlistUpdateToTasks(
  payload: TransferTasksPayload
): Promise<{ projectId: string; taskCount: number } | null> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    let projectId = payload.existingProjectId;

    // 1. If no existing project selected, create a new project
    if (!projectId) {
      const socialLinks = parseResourceLinks(payload.rawText || "", {
        sourceUrl: payload.sourceUrl,
        fallbackRefLink: payload.refLink,
      });
      const detectedChainName = detectChain(payload.rawText || "", payload.projectName);

      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: payload.projectName.trim(),
          chain: detectedChainName,
          status: "in_progress",
          social_links: socialLinks,
          guide_content: payload.registeredAccount
            ? `Akun Pendaftaran Waitlist: ${payload.registeredAccount}\n\n${payload.rawText || ""}`
            : payload.rawText || null,
        })
        .select("id")
        .single();

      if (projErr || !projData) {
        throw projErr || new Error("Gagal membuat proyek airdrop baru.");
      }
      projectId = projData.id;
    }

    // 2. Insert tasks into public.tasks
    const taskRows = payload.tasks
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((title) => ({
        project_id: projectId,
        title,
        type: payload.taskType || ("one_time" as const),
        status: "pending" as const,
      }));

    if (taskRows.length > 0) {
      const { error: taskErr } = await supabase.from("tasks").insert(taskRows);
      if (taskErr) {
        console.error("Error inserting tasks:", taskErr);
      }
    }

    // 3. Add to project thread history if rawText is provided
    if (payload.rawText) {
      const taskListText = payload.tasks.map((t) => `• ${t}`).join("\n");
      await supabase.from("project_updates").insert({
        project_id: projectId,
        content: `⚡ Tugas Baru dari Update Waitlist:\n${taskListText}\n\n${payload.rawText.slice(0, 400)}`,
        type: "task",
        source_url: payload.sourceUrl || null,
        is_completed: false,
      });
    }

    return { projectId: projectId!, taskCount: taskRows.length };
  } catch (err) {
    console.error("transferWaitlistUpdateToTasks error:", err);
    return null;
  }
}
