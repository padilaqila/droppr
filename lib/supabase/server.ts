import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const DUMMY_URL = "https://placeholder-project.supabase.co";
const DUMMY_KEY = "placeholder-anon-key";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  envUrl &&
    envUrl.trim() !== "" &&
    envUrl !== DUMMY_URL &&
    envKey &&
    envKey.trim() !== "" &&
    envKey !== DUMMY_KEY
);

let hasWarnedServer = false;
function checkSupabaseConfig() {
  if (!isConfigured && !hasWarnedServer) {
    console.warn(
      "[Droppr] Supabase belum dikonfigurasi — isi .env.local, lihat .env.local.example"
    );
    hasWarnedServer = true;
  }
}

// Warn once when module is loaded if unconfigured
checkSupabaseConfig();

export async function createClient() {
  checkSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    isConfigured && envUrl ? envUrl : DUMMY_URL,
    isConfigured && envKey ? envKey : DUMMY_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
