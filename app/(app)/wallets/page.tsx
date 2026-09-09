import { createClient } from "@/lib/supabase/server";
import { WalletsClientView } from "./wallets-client-view";

export default async function WalletsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await (supabase as any).auth.getUser();

  // 1. Fetch wallets with linked projects
  const { data: rawWallets } = await (supabase as any)
    .from("wallets")
    .select("*, project_wallets(projects(id, name))")
    .order("created_at", { ascending: false });

  const formattedWallets = (rawWallets || []).map((w: any) => ({
    ...w,
    projects: (w.project_wallets || [])
      .map((pw: any) => pw.projects)
      .filter(Boolean),
  }));

  // 2. Fetch user accounts (DB table with metadata fallback)
  let initialAccounts: any[] = [];
  if (user) {
    try {
      const { data: dbAccounts, error: dbError } = await (supabase as any)
        .from("user_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dbError && Array.isArray(dbAccounts)) {
        initialAccounts = dbAccounts.map((a: any) => ({
          id: String(a.id),
          user_id: a.user_id,
          platform: a.platform,
          handle: a.handle,
          label: a.label,
          notes: a.notes,
          created_at: a.created_at,
        }));
      } else if (Array.isArray(user.user_metadata?.social_accounts)) {
        initialAccounts = user.user_metadata.social_accounts;
      }
    } catch {
      if (Array.isArray(user.user_metadata?.social_accounts)) {
        initialAccounts = user.user_metadata.social_accounts;
      }
    }
  }

  return (
    <WalletsClientView
      initialWallets={formattedWallets}
      initialAccounts={initialAccounts}
      currentUserEmail={user?.email || null}
    />
  );
}
