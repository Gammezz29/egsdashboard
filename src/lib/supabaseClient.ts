import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseConfigurationError } from "@/lib/supabase";

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const url = typeof import.meta.env.VITE_SUPABASE_URL === "string"
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : "";
  const anonKey = typeof import.meta.env.VITE_SUPABASE_ANON_KEY === "string"
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : "";

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError(
      "Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  });

  return cachedClient;
};
