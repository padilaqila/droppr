import { createClient } from "@/lib/supabase/client";

export interface UserAccountItem {
  id: string;
  user_id?: string;
  platform: string; // "Twitter / X" | "Discord" | "Telegram" | "Email" | "GitHub" | "Google" | "Custom"
  handle: string;
  label?: string | null;
  notes?: string | null;
  created_at: string;
}

/**
 * Fetch all saved personal accounts for the logged-in user.
 * Seamlessly supports Supabase `user_accounts` table with automatic fallback
 * to `auth.user_metadata.social_accounts`.
 */
export async function fetchUserAccounts(): Promise<UserAccountItem[]> {
  try {
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    // 1. Try fetching from public.user_accounts table
    const { data: dbAccounts, error: dbError } = await supabase
      .from("user_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbError && Array.isArray(dbAccounts)) {
      return dbAccounts.map((a: any) => ({
        id: String(a.id),
        user_id: a.user_id,
        platform: a.platform,
        handle: a.handle,
        label: a.label,
        notes: a.notes,
        created_at: a.created_at,
      }));
    }

    // 2. Fallback to auth.user_metadata.social_accounts if table doesn't exist yet
    const metaAccounts = user.user_metadata?.social_accounts;
    if (Array.isArray(metaAccounts) && metaAccounts.length > 0) {
      return metaAccounts;
    }
  } catch (err) {
    console.error("fetchUserAccounts error:", err);
  }

  return [];
}

/**
 * Save a new user social/identity account.
 * Writes to public.user_accounts table if available, with automatic sync to user_metadata.
 */
export async function createUserAccount(
  account: Omit<UserAccountItem, "id" | "created_at">
): Promise<UserAccountItem | null> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Sesi pengguna tidak ditemukan.");

  const nowIso = new Date().toISOString();
  const newAccountObj: UserAccountItem = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `acc_${Date.now()}`,
    user_id: user.id,
    platform: account.platform,
    handle: account.handle.trim(),
    label: account.label?.trim() || null,
    notes: account.notes?.trim() || null,
    created_at: nowIso,
  };

  try {
    // 1. Try insert into public.user_accounts table
    const { data, error } = await supabase
      .from("user_accounts")
      .insert({
        user_id: user.id,
        platform: account.platform,
        handle: account.handle.trim(),
        label: account.label?.trim() || null,
        notes: account.notes?.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      // Sync to user_metadata as well for fast access
      const currentMeta = Array.isArray(user.user_metadata?.social_accounts)
        ? user.user_metadata.social_accounts
        : [];
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          social_accounts: [data, ...currentMeta.filter((a: any) => a.id !== data.id)],
        },
      });
      return data;
    }
  } catch (err) {
    console.warn("DB insert to user_accounts failed, using metadata fallback:", err);
  }

  // 2. Fallback to auth.user_metadata
  try {
    const currentMeta = Array.isArray(user.user_metadata?.social_accounts)
      ? user.user_metadata.social_accounts
      : [];
    const updatedMeta = [newAccountObj, ...currentMeta];
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        social_accounts: updatedMeta,
      },
    });
    return newAccountObj;
  } catch (metaErr: any) {
    console.error("Failed to save to user_metadata:", metaErr);
    throw new Error(metaErr?.message || "Gagal menyimpan akun.");
  }
}

/**
 * Update an existing user social/identity account by ID.
 * Synchronizes both public.user_accounts table and auth.user_metadata.
 */
export async function updateUserAccount(
  id: string,
  updates: Partial<Omit<UserAccountItem, "id" | "created_at" | "user_id">>
): Promise<boolean> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let success = false;

  // 1. Try update public.user_accounts table
  try {
    const payload: Record<string, any> = {};
    if (updates.label !== undefined) payload.label = updates.label ? updates.label.trim() : null;
    if (updates.handle !== undefined) payload.handle = updates.handle.trim();
    if (updates.platform !== undefined) payload.platform = updates.platform;
    if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;

    const { error } = await supabase
      .from("user_accounts")
      .update(payload)
      .eq("id", id);

    if (!error) success = true;
  } catch (err) {
    console.warn("Table update to user_accounts failed, using metadata fallback:", err);
  }

  // 2. Sync to auth.user_metadata
  try {
    const currentMeta = Array.isArray(user.user_metadata?.social_accounts)
      ? user.user_metadata.social_accounts
      : [];
    const updatedMeta = currentMeta.map((a: any) =>
      String(a.id) === String(id) ? { ...a, ...updates } : a
    );
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        social_accounts: updatedMeta,
      },
    });
    success = true;
  } catch (metaErr) {
    console.warn("user_metadata sync failed:", metaErr);
  }

  return success;
}

/**
 * Delete a user account by ID.
 */
export async function deleteUserAccount(id: string): Promise<boolean> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let success = false;

  // Try delete from table
  try {
    const { error } = await supabase.from("user_accounts").delete().eq("id", id);
    if (!error) success = true;
  } catch {
    // ignore
  }

  // Also clean from user_metadata
  try {
    const currentMeta = Array.isArray(user.user_metadata?.social_accounts)
      ? user.user_metadata.social_accounts
      : [];
    const filtered = currentMeta.filter((a: any) => a.id !== id);
    if (filtered.length !== currentMeta.length) {
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          social_accounts: filtered,
        },
      });
      success = true;
    }
  } catch {
    // ignore
  }

  return success;
}

/**
 * Convenience helper: fetch both wallets and accounts for quick picker.
 */
export async function fetchQuickPickerIdentities(): Promise<{
  wallets: Array<{ id: string; address: string; label: string | null; chain: string | null }>;
  accounts: UserAccountItem[];
  userEmail: string | null;
}> {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { wallets: [], accounts: [], userEmail: null };
  }

  // Fetch wallets
  const { data: rawWallets } = await supabase
    .from("wallets")
    .select("id, address, label, chain")
    .order("created_at", { ascending: false });

  // Fetch accounts
  const accounts = await fetchUserAccounts();

  return {
    wallets: Array.isArray(rawWallets) ? rawWallets : [],
    accounts,
    userEmail: user.email || null,
  };
}
