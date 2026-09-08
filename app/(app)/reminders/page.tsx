import { createClient } from "@/lib/supabase/server";
import { RemindersClientView, type EnrichedReminder } from "./reminders-client-view";

export default async function RemindersPage() {
  const supabase = await createClient();

  const { data: rawReminders } = await (supabase as any)
    .from("reminders")
    .select("*, projects(id, name, chain, status, social_links), tasks(id, title)")
    .order("next_trigger_at", { ascending: true });

  const reminders: EnrichedReminder[] = rawReminders || [];

  return <RemindersClientView initialReminders={reminders} />;
}
