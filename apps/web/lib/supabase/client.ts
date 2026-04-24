import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getPreferredStorage(rememberMe?: boolean): SupportedStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (rememberMe === false) {
    window.sessionStorage.setItem("cycleiq-remember-me", "false");
    return window.sessionStorage;
  }

  if (rememberMe === true) {
    window.sessionStorage.removeItem("cycleiq-remember-me");
    return window.localStorage;
  }

  return window.sessionStorage.getItem("cycleiq-remember-me") === "false"
    ? window.sessionStorage
    : window.localStorage;
}

function createBrowserSupabaseClient(rememberMe?: boolean): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: getPreferredStorage(rememberMe),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(rememberMe?: boolean): SupabaseClient {
  return createBrowserSupabaseClient(rememberMe);
}
