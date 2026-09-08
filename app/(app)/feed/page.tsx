import React from "react";
import { createClient } from "@/lib/supabase/server";
import { FeedClientView } from "./feed-client-view";
import type { AirdropFeedItem } from "@/lib/supabase/airdrop-feeds";
import { cleanHtmlEntities } from "@/lib/supabase/thread-updates";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let initialFeeds: AirdropFeedItem[] = [];

  try {
    const { data, error } = await (supabase as any)
      .from("airdrop_feeds")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      initialFeeds = data.map((row: any) => ({
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
    console.error("FeedPage initial fetch error:", err);
  }

  return <FeedClientView initialFeeds={initialFeeds} />;
}
