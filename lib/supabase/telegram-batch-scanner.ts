/**
 * telegram-batch-scanner.ts
 * Engine for scanning Telegram updates across multiple projects with controlled rate limits,
 * smart anti-duplicate filters, and bulk saving to project threads.
 */

import { bulkCreateProjectThreads, cleanHtmlEntities } from "@/lib/supabase/thread-updates";
import { createClient } from "@/lib/supabase/client";

export interface BatchTelegramItem {
  id: string;
  projectId: string;
  projectName: string;
  channel: string;
  channelName: string;
  postUrl: string;
  date: string;
  text: string;
  title: string;
  selected?: boolean;
}

export interface ProjectScanTarget {
  id: string;
  name: string;
  chain?: string | null;
  status?: string | null;
  social_links?: Record<string, any> | null;
}

// Common spam / promotional keywords to filter out from Telegram channels
const SPAM_PATTERNS = [
  /gabung\s+(?:grup|vip|channel|premium)/i,
  /join\s+(?:vip|premium|inner\s+circle)/i,
  /disclaimer\s*:\s*on/i,
  /daftar\s+(?:bybit|binance|bitget|okx|mexc)\s+di\s+sini/i,
  /bonus\s+(?:deposit|trading|referral)\s+hingga/i,
  /promo\s+spesial\s+member/i,
  /sinyal\s+trading\s+akurat/i,
];

function isSpamTelegramText(text: string): boolean {
  if (!text || text.trim().length < 20) return true;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

function derivePostTitle(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length > 0) {
    // Pick the first substantial line as title, truncated
    const firstLine = lines[0].replace(/^[#*•\-\d\.]+\s*/, "").trim();
    if (firstLine.length > 80) {
      return firstLine.slice(0, 77) + "...";
    }
    return firstLine || "Kabar Terbaru Telegram";
  }
  return "Kabar Terbaru Telegram";
}

/**
 * Checks text similarity using word-token jaccard overlap
 */
function arePostsSimilar(textA: string, textB: string): boolean {
  const wordsA = new Set(textA.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(textB.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  const similarity = intersection / union;
  return similarity > 0.65; // High similarity threshold (65%)
}

/**
 * Fetch existing source URLs from database for a set of projects to avoid duplicates
 */
async function fetchExistingSourceUrls(projectIds: string[]): Promise<Set<string>> {
  const existingUrls = new Set<string>();
  if (projectIds.length === 0) return existingUrls;

  try {
    const supabase = createClient() as any;

    // 1. From project_updates table
    const { data: updatesData } = await supabase
      .from("project_updates")
      .select("source_url")
      .in("project_id", projectIds)
      .not("source_url", "is", null);

    if (Array.isArray(updatesData)) {
      updatesData.forEach((row: any) => {
        if (row.source_url) existingUrls.add(row.source_url.toLowerCase().trim());
      });
    }

    // 2. From projects.social_links.thread_updates fallback
    const { data: projectsData } = await supabase
      .from("projects")
      .select("social_links")
      .in("id", projectIds);

    if (Array.isArray(projectsData)) {
      projectsData.forEach((row: any) => {
        const sl = row.social_links as Record<string, any> | null;
        if (sl && Array.isArray(sl.thread_updates)) {
          sl.thread_updates.forEach((item: any) => {
            if (item.source_url) existingUrls.add(item.source_url.toLowerCase().trim());
          });
        }
      });
    }
  } catch (err) {
    console.warn("Failed to fetch existing thread source URLs:", err);
  }

  return existingUrls;
}

/**
 * Scan Telegram updates in batches with throttled queues to prevent rate limiting
 */
export async function scanProjectsTelegramBatch(
  projects: ProjectScanTarget[],
  onProgress?: (current: number, total: number, currentProjectName: string) => void
): Promise<BatchTelegramItem[]> {
  // Filter only active projects (in_progress or joined waitlist)
  const targets = projects.filter((p) => {
    const st = (p.status || "").toLowerCase();
    return st === "in_progress" || st === "joined" || st === "waiting" || !st;
  });

  if (targets.length === 0) {
    return [];
  }

  const projectIds = targets.map((p) => p.id);
  const existingUrls = await fetchExistingSourceUrls(projectIds);
  const allDiscoveredItems: BatchTelegramItem[] = [];

  for (let i = 0; i < targets.length; i++) {
    const proj = targets[i];
    if (onProgress) {
      onProgress(i + 1, targets.length, proj.name);
    }

    // Determine target channel (prioritize source channel if present in social_links)
    const sl = proj.social_links || {};
    const tgSourceUrl = (sl.telegram_post_url || sl.telegram || "").toLowerCase();
    let preferredChannel: "airdropfind" | "dutacryptoairdrop" = "airdropfind";

    if (tgSourceUrl.includes("dutacrypto")) {
      preferredChannel = "dutacryptoairdrop";
    }

    try {
      // Fetch search results for project name
      const res = await fetch(
        `/api/telegram/search?q=${encodeURIComponent(proj.name.trim())}&channel=${preferredChannel}`
      );

      if (res.ok) {
        const data = await res.json();
        const rawUpdates: any[] = data.updates || [];

        const validProjectItems: BatchTelegramItem[] = [];

        for (const item of rawUpdates) {
          const cleanPostUrl = (item.postUrl || "").toLowerCase().trim();

          // 1. Skip if URL already in database thread
          if (existingUrls.has(cleanPostUrl)) {
            continue;
          }

          // 2. Skip spam / promotional messages
          if (isSpamTelegramText(item.text)) {
            continue;
          }

          // 3. Skip if duplicate of another item already discovered in this batch
          const isDup = validProjectItems.some((existing) =>
            arePostsSimilar(existing.text, item.text)
          );
          if (isDup) {
            continue;
          }

          const title = derivePostTitle(item.text);

          validProjectItems.push({
            id: `batch-${proj.id}-${item.id || Date.now()}`,
            projectId: proj.id,
            projectName: proj.name,
            channel: item.channel,
            channelName: item.channelName,
            postUrl: item.postUrl,
            date: item.date,
            text: cleanHtmlEntities(item.text),
            title: title,
            selected: true,
          });
        }

        // Limit to max 3 latest updates per project to prevent flooding
        allDiscoveredItems.push(...validProjectItems.slice(0, 3));
      }
    } catch (err) {
      console.warn(`Error scanning project ${proj.name}:`, err);
    }

    // Small delay between requests to be polite to Telegram web preview
    if (i < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return allDiscoveredItems;
}

/**
 * Bulk save selected telegram updates into projects threads
 */
export async function saveBatchUpdatesToThreads(
  selectedItems: BatchTelegramItem[]
): Promise<{ successCount: number; errorCount: number }> {
  if (selectedItems.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  // Group items by projectId
  const byProject = new Map<string, BatchTelegramItem[]>();
  for (const it of selectedItems) {
    const list = byProject.get(it.projectId) || [];
    list.push(it);
    byProject.set(it.projectId, list);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [projectId, items] of byProject.entries()) {
    try {
      const threadRows = items.map((it) => ({
        project_id: projectId,
        type: "news" as const,
        title: it.title,
        content: it.text,
        source_url: it.postUrl,
        source_date: it.date,
        status: "info" as const,
      }));

      await bulkCreateProjectThreads(projectId, threadRows);
      successCount += items.length;
    } catch (err) {
      console.error(`Failed to bulk save updates for project ${projectId}:`, err);
      errorCount += items.length;
    }
  }

  return { successCount, errorCount };
}
