import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseConfigurationError } from "@/lib/supabase";

let cachedAdminClient: SupabaseClient | null = null;

const createNoopStorage = (): Storage =>
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    get length() {
      return 0;
    },
  }) as Storage;

export const getAdminSupabaseClient = (): SupabaseClient => {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url =
    typeof import.meta.env.VITE_SUPABASE_URL === "string"
      ? import.meta.env.VITE_SUPABASE_URL.trim()
      : "";
  const serviceRoleKey =
    typeof import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY === "string"
      ? import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY.trim()
      : "";

  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigurationError(
      "Supabase service role credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: createNoopStorage(),
    },
  });

  return cachedAdminClient;
};
