
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const isValidSupabaseUrl = (() => {
  try {
    const url = new URL(supabaseUrl);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      !url.pathname.includes("/rest/v1")
    );
  } catch {
    return false;
  }
})();

export const hasSupabase = Boolean(
  isValidSupabaseUrl && supabaseAnonKey
);

if (!hasSupabase) {
  console.error(
    "Supabase configuration is missing or invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
