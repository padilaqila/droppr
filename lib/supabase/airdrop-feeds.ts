import { createClient } from "@/lib/supabase/client";
import { cleanHtmlEntities, sanitizeSurrogates, sanitizeJsonObject } from "./thread-updates";
import { parseAirdropProjectData, cleanProjectName } from "./airdrop-parser";

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
  linked_project_id?: string | null;
  created_at: string;
  expires_at?: string;
}

/**
 * Synchronize airdrop_feeds is_imported status with actual user projects.
 * If a project was deleted from the projects table, its corresponding feed is reverted to is_imported = false.
 */
export async function syncFeedsWithProjects(
  feeds: AirdropFeedItem[],
  userProjects: Array<{ id: string; name: string; social_links?: any }>
): Promise<AirdropFeedItem[]> {
  const supabase = createClient() as any;

  // Build lookup structures
  const projectBySourceUrl = new Map<string, string>();
  const projectByName = new Map<string, string>();

  for (const p of userProjects) {
    const s = p.social_links || {};
    const url = s.telegram_post_url || s.telegram || s.source_url;
    if (url && typeof url === "string") {
      projectBySourceUrl.set(url.trim(), p.id);
    }
    if (p.name && typeof p.name === "string") {
      projectByName.set(p.name.trim().toLowerCase(), p.id);
    }
  }

  const idsToRevert: string[] = [];

  const syncedFeeds = feeds.map((feed) => {
    let matchedProjectId: string | undefined = undefined;
    if (feed.source_url && projectBySourceUrl.has(feed.source_url.trim())) {
      matchedProjectId = projectBySourceUrl.get(feed.source_url.trim());
    } else {
      const cleanTitle = cleanProjectName(feed.title).trim().toLowerCase();
      if (cleanTitle && projectByName.has(cleanTitle)) {
        matchedProjectId = projectByName.get(cleanTitle);
      }
    }

    const actuallyExists = Boolean(matchedProjectId);

    // If marked imported in feed, but project no longer exists in projects table
    if (feed.is_imported && !actuallyExists) {
      idsToRevert.push(feed.id);
      return {
        ...feed,
        is_imported: false,
        linked_project_id: null,
      };
    }

    return {
      ...feed,
      is_imported: actuallyExists,
      linked_project_id: matchedProjectId || null,
    };
  });

  // Revert stale feeds in database asynchronously in the background
  if (idsToRevert.length > 0) {
    try {
      await supabase
        .from("airdrop_feeds")
        .update({ is_imported: false })
        .in("id", idsToRevert);
    } catch (err) {
      console.warn("Background feed status sync warning:", err);
    }
  }

  return syncedFeeds;
}

/**
 * Reset feed is_imported status back to false
 */
export async function resetFeedImportStatus(feedId: string): Promise<boolean> {
  const supabase = createClient() as any;
  try {
    const { error } = await supabase
      .from("airdrop_feeds")
      .update({ is_imported: false })
      .eq("id", feedId);

    return !error;
  } catch (err) {
    console.error("resetFeedImportStatus error:", err);
    return false;
  }
}

/**
 * Fetch airdrop feeds from Supabase (TTL active within 90 days) and sync with existing projects
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

    const [feedsRes, projectsRes] = await Promise.all([
      query,
      supabase.from("projects").select("id, name, social_links"),
    ]);

    if (!feedsRes.error && Array.isArray(feedsRes.data)) {
      const rawFeeds: AirdropFeedItem[] = feedsRes.data.map((row: any) => ({
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

      const userProjects = (!projectsRes.error && Array.isArray(projectsRes.data))
        ? projectsRes.data
        : [];

      return await syncFeedsWithProjects(rawFeeds, userProjects);
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

export interface ConvertFeedResult {
  success: boolean;
  projectId?: string;
  error?: string;
}

/**
 * Convert a curated feed item directly into a new Droppr Project with tasks
 */
export async function convertFeedToProject(feed: AirdropFeedItem): Promise<ConvertFeedResult> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sesi login tidak valid. Silakan login ulang." };
  }

  try {
    // 1. Comprehensive Zero-Token Link & Content Parsing
    const parsed = parseAirdropProjectData(feed.title, feed.raw_text, {
      sourceUrl: feed.source_url,
      cost: feed.cost,
      existingTasks: feed.tasks,
    });

    // Clean & sanitize all string fields to prevent Postgres 22P02 unicode errors
    const safeName =
      sanitizeSurrogates(parsed.name).trim() ||
      sanitizeSurrogates(feed.title).trim() ||
      "Airdrop Project";

    const safeChain = sanitizeSurrogates(parsed.chain).trim() || "Multi-chain";
    const safeGuideContent = sanitizeSurrogates(parsed.guide_content);
    const safeSocialLinks = sanitizeJsonObject(parsed.social_links || {});

    // Determine initial project status based on feed category
    const initialStatus =
      feed.category === "testnet" || feed.category === "retro" ? "in_progress" : "not_started";

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
      console.error("Error inserting project from feed:", projErr);
      return {
        success: false,
        error: projErr?.message || "Gagal menyimpan data project ke database.",
      };
    }

    const projectId = projectData.id;

    // 3. Insert detected and formatted tasks safely
    if (parsed.tasks && parsed.tasks.length > 0) {
      const taskRows = parsed.tasks
        .map((taskItem) => ({
          project_id: projectId,
          title: sanitizeSurrogates(taskItem.title).trim(),
          type: taskItem.type === "daily" ? ("daily" as const) : ("one_time" as const),
          status: "pending" as const,
        }))
        .filter((t) => t.title.length > 0);

      if (taskRows.length > 0) {
        const { error: taskErr } = await supabase.from("tasks").insert(taskRows);
        if (taskErr) {
          console.warn("Non-fatal: failed to insert some tasks:", taskErr);
        }
      }
    }

    // 4. Mark feed item as imported
    await supabase
      .from("airdrop_feeds")
      .update({ is_imported: true })
      .eq("id", feed.id);

    return { success: true, projectId };
  } catch (err: any) {
    console.error("convertFeedToProject error:", err);
    return { success: false, error: err?.message || "Terjadi kesalahan saat memproses data feed." };
  }
}

/**
 * Convert a curated feed item directly into a new Droppr Project using SumoPod AI
 * Parses chain, social links (faucet, dapp, twitter, telegram), and tasks categorized by frequency.
 * Automatically falls back to standard convertFeedToProject if AI is unavailable.
 */
export async function convertFeedToProjectWithAI(feed: AirdropFeedItem): Promise<ConvertFeedResult> {
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

    if (!user) {
      return { success: false, error: "Sesi login tidak valid. Silakan login ulang." };
    }

    // Merge social links with source_url
    const rawSocialLinks = {
      ...(aiData.social_links || {}),
      telegram: feed.source_url,
      telegram_post_url: feed.source_url,
    };
    const safeSocialLinks = sanitizeJsonObject(rawSocialLinks);

    const safeName =
      sanitizeSurrogates(cleanHtmlEntities(aiData.name || feed.title)).trim() ||
      "Airdrop Project";
    const safeChain =
      sanitizeSurrogates(cleanHtmlEntities(aiData.chain || "Multi-chain")).trim();
    const safeGuideContent =
      sanitizeSurrogates(cleanHtmlEntities(aiData.guide_content || feed.raw_text));

    // Insert into projects
    const { data: projectData, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: safeName,
        chain: safeChain,
        status: aiData.status || "not_started",
        social_links: safeSocialLinks,
        guide_content: safeGuideContent,
      })
      .select("id")
      .single();

    if (projErr || !projectData) {
      console.warn("Error inserting AI project, falling back:", projErr);
      return convertFeedToProject(feed);
    }

    const projectId = projectData.id;

    // Insert tasks parsed by AI safely
    const tasksToInsert: any[] = [];
    if (Array.isArray(aiData.tasks) && aiData.tasks.length > 0) {
      for (const t of aiData.tasks) {
        if (t && t.title) {
          const cleanTitle = sanitizeSurrogates(cleanHtmlEntities(t.title)).trim();
          if (cleanTitle.length > 0) {
            tasksToInsert.push({
              project_id: projectId,
              title: cleanTitle,
              type: t.type === "daily" ? "daily" : t.type === "weekly" ? "weekly" : "one_time",
              status: "pending",
            });
          }
        }
      }
    } else if (feed.tasks && feed.tasks.length > 0) {
      for (const t of feed.tasks) {
        const cleanTitle = sanitizeSurrogates(cleanHtmlEntities(t)).trim();
        if (cleanTitle.length > 0) {
          tasksToInsert.push({
            project_id: projectId,
            title: cleanTitle,
            type: t.toLowerCase().includes("daily") ? "daily" : "one_time",
            status: "pending",
          });
        }
      }
    }

    if (tasksToInsert.length > 0) {
      await supabase.from("tasks").insert(tasksToInsert);
    }

    // Insert accounts if detected safely
    if (Array.isArray(aiData.accounts) && aiData.accounts.length > 0) {
      const accountsToInsert = aiData.accounts
        .filter((a: any) => a && a.label)
        .map((a: any) => ({
          project_id: projectId,
          label: sanitizeSurrogates(cleanHtmlEntities(a.label)).trim(),
          username_email: sanitizeSurrogates(cleanHtmlEntities(a.username_email || "")).trim(),
        }))
        .filter((a: any) => a.label.length > 0);

      if (accountsToInsert.length > 0) {
        await supabase.from("project_accounts").insert(accountsToInsert);
      }
    }

    // Mark feed item as imported
    await supabase
      .from("airdrop_feeds")
      .update({ is_imported: true })
      .eq("id", feed.id);

    return { success: true, projectId };
  } catch (err: any) {
    console.error("convertFeedToProjectWithAI error:", err);
    return convertFeedToProject(feed);
  }
}
