import { createBrowserClient } from "@supabase/ssr";

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

let hasWarnedClient = false;
function checkSupabaseConfig() {
  if (!isConfigured && !hasWarnedClient) {
    console.warn(
      "[Droppr] Supabase belum dikonfigurasi — isi .env.local, lihat .env.local.example"
    );
    hasWarnedClient = true;
  }
}

// Warn once when module is loaded if unconfigured
checkSupabaseConfig();

export function createClient() {
  checkSupabaseConfig();
  return createBrowserClient(
    isConfigured && envUrl ? envUrl : DUMMY_URL,
    isConfigured && envKey ? envKey : DUMMY_KEY
  );
}
