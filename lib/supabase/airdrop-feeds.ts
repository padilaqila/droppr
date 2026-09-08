import { createClient } from "@/lib/supabase/client";
import { cleanHtmlEntities } from "./thread-updates";

export interface AirdropFeedItem {
  id: string;
  channel: "dutacryptoairdrop" | "airdropfind" | "general";
  channel_name: string;
  title: string;
  summary?: string | null;
  category: "testnet" | "airdrop" | "waitlist" | "retro" | "general";
  cost?: string | null;
  tasks: string[];
  source_url: string;
  raw_text: string;
  is_imported?: boolean;
  created_at: string;
  expires_at?: string;
}

/**
 * Fetch airdrop feeds from Supabase (TTL active within 90 days)
 */
export async function fetchAirdropFeeds(options?: {
  channel?: string;
  category?: string;
  search?: string;
}): Promise<AirdropFeedItem[]> {
  const supabase = createClient() as any;
  const nowIso = new Date().toISOString();

  try {
    let query = supabase
      .from("airdrop_feeds")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (options?.channel && options.channel !== "all") {
      query = query.eq("channel", options.channel);
    }

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: String(row.id),
        channel: row.channel,
        channel_name: row.channel_name,
        title: cleanHtmlEntities(row.title),
        summary: row.summary ? cleanHtmlEntities(row.summary) : null,
        category: row.category,
        cost: row.cost ? cleanHtmlEntities(row.cost) : null,
        tasks: Array.isArray(row.tasks) ? row.tasks.map((t: string) => cleanHtmlEntities(t)) : [],
        source_url: row.source_url,
        raw_text: cleanHtmlEntities(row.raw_text),
        is_imported: Boolean(row.is_imported),
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
    }
  } catch (err) {
    console.error("fetchAirdropFeeds error:", err);
  }

  return [];
}

/**
 * Delete a feed item by id
 */
export async function deleteAirdropFeed(feedId: string): Promise<boolean> {
  const supabase = createClient() as any;

  try {
    const { error } = await supabase
      .from("airdrop_feeds")
      .delete()
      .eq("id", feedId);

    return !error;
  } catch (err) {
    console.error("deleteAirdropFeed error:", err);
    return false;
  }
}

/**
 * Cleanup feeds older than 90 days
 */
export async function cleanupExpiredFeeds(): Promise<number> {
  const supabase = createClient() as any;
  const nowIso = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("airdrop_feeds")
      .delete()
      .lt("expires_at", nowIso)
      .select("id");

    if (!error && Array.isArray(data)) {
      return data.length;
    }
  } catch (err) {
    console.error("cleanupExpiredFeeds error:", err);
  }

  return 0;
}

import { parseAirdropProjectData } from "./airdrop-parser";

/**
 * Convert a curated feed item directly into a new Droppr Project with tasks
 */
export async function convertFeedToProject(feed: AirdropFeedItem): Promise<string | null> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    // 1. Comprehensive Zero-Token Link & Content Parsing
    const parsed = parseAirdropProjectData(feed.title, feed.raw_text, {
      sourceUrl: feed.source_url,
      cost: feed.cost,
      existingTasks: feed.tasks,
    });

    // Determine initial project status based on feed category
    const initialStatus = feed.category === "testnet" || feed.category === "retro" ? "in_progress" : "not_started";

    // 2. Insert into projects table
    const { data: projectData, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: parsed.name,
        chain: parsed.chain,
        status: initialStatus,
        social_links: parsed.social_links,
        guide_content: parsed.guide_content,
      })
      .select("id")
      .single();

    if (projErr || !projectData) {
      throw projErr || new Error("Gagal membuat project dari feed.");
    }

    const projectId = projectData.id;

    // 3. Insert detected and formatted tasks
    if (parsed.tasks && parsed.tasks.length > 0) {
      const taskRows = parsed.tasks.map((taskItem) => ({
        project_id: projectId,
        title: taskItem.title,
        type: taskItem.type,
        status: "pending" as const,
      }));

      await supabase.from("tasks").insert(taskRows);
    }

    // 4. Mark feed item as imported
    await supabase
      .from("airdrop_feeds")
      .update({ is_imported: true })
      .eq("id", feed.id);

    return projectId;
  } catch (err) {
    console.error("convertFeedToProject error:", err);
    return null;
  }
}

/**
 * Convert a curated feed item directly into a new Droppr Project using SumoPod AI
 * Parses chain, social links (faucet, dapp, twitter, telegram), and tasks categorized by frequency.
 * Automatically falls back to standard convertFeedToProject if AI is unavailable.
 */
export async function convertFeedToProjectWithAI(feed: AirdropFeedItem): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/parse-airdrop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: feed.raw_text }),
    });

    if (!res.ok) {
      console.warn("AI parse-airdrop failed, falling back to standard converter");
      return convertFeedToProject(feed);
    }

    const resJson = await res.json();
    const aiData = resJson.data;

    if (!aiData || !aiData.name) {
      return convertFeedToProject(feed);
    }

    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Merge social links with source_url
    const socialLinks = {
      ...(aiData.social_links || {}),
      telegram: feed.source_url,
      telegram_post_url: feed.source_url,
    };

    // Insert into projects
    const { data: projectData, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: cleanHtmlEntities(aiData.name || feed.title),
        chain: cleanHtmlEntities(aiData.chain || "Multi-chain"),
        status: aiData.status || "not_started",
        social_links: socialLinks,
        guide_content: cleanHtmlEntities(aiData.guide_content || feed.raw_text),
      })
      .select("id")
      .single();

    if (projErr || !projectData) {
      console.warn("Error inserting AI project, falling back:", projErr);
      return convertFeedToProject(feed);
    }

    const projectId = projectData.id;

    // Insert tasks parsed by AI
    const tasksToInsert: any[] = [];
    if (Array.isArray(aiData.tasks) && aiData.tasks.length > 0) {
      for (const t of aiData.tasks) {
        if (t && t.title) {
          tasksToInsert.push({
            project_id: projectId,
            title: cleanHtmlEntities(t.title),
            type: t.type === "daily" ? "daily" : t.type === "weekly" ? "weekly" : "one_time",
            status: "pending",
          });
        }
      }
    } else if (feed.tasks && feed.tasks.length > 0) {
      for (const t of feed.tasks) {
        tasksToInsert.push({
          project_id: projectId,
          title: cleanHtmlEntities(t),
          type: t.toLowerCase().includes("daily") ? "daily" : "one_time",
          status: "pending",
        });
      }
    }

    if (tasksToInsert.length > 0) {
      await supabase.from("tasks").insert(tasksToInsert);
    }

    // Insert accounts if detected
    if (Array.isArray(aiData.accounts) && aiData.accounts.length > 0) {
      const accountsToInsert = aiData.accounts
        .filter((a: any) => a && a.label)
        .map((a: any) => ({
          project_id: projectId,
          label: cleanHtmlEntities(a.label),
          username_email: cleanHtmlEntities(a.username_email || ""),
        }));
      if (accountsToInsert.length > 0) {
        await supabase.from("project_accounts").insert(accountsToInsert);
      }
    }

    // Mark feed item as imported
    await supabase
      .from("airdrop_feeds")
      .update({ is_imported: true })
      .eq("id", feed.id);

    return projectId;
  } catch (err) {
    console.error("convertFeedToProjectWithAI error:", err);
    return convertFeedToProject(feed);
  }
}
