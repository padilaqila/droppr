import React from "react";
import { createClient } from "@/lib/supabase/server";
import { WaitlistClientView } from "./waitlist-client-view";
import type { WaitlistItem } from "@/lib/supabase/waitlists";
import { cleanHtmlEntities } from "@/lib/supabase/thread-updates";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let initialWaitlists: WaitlistItem[] = [];

  try {
    const { data, error } = await (supabase as any)
      .from("waitlists")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      initialWaitlists = data.map((row: any) => ({
        id: String(row.id),
        project_name: cleanHtmlEntities(row.project_name),
        title: cleanHtmlEntities(row.title),
        summary: row.summary ? cleanHtmlEntities(row.summary) : null,
        channel: row.channel,
        source_url: row.source_url,
        raw_text: cleanHtmlEntities(row.raw_text),
        status: row.status as "pending" | "joined",
        registered_account: row.registered_account,
        ref_link: row.ref_link,
        tasks: Array.isArray(row.tasks) ? row.tasks.map((t: string) => cleanHtmlEntities(t)) : [],
        joined_at: row.joined_at,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
    }
  } catch (err) {
    console.error("WaitlistPage initial fetch error:", err);
  }

  return <WaitlistClientView initialWaitlists={initialWaitlists} />;
}
