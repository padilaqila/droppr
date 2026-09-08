import { createClient } from "@/lib/supabase/server";
import { WalletsClientView } from "./wallets-client-view";

export default async function WalletsPage() {
  const supabase = await createClient();

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

  return <WalletsClientView initialWallets={formattedWallets} />;
}
