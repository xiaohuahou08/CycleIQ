import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/env";

/**
 * Browser Supabase client. Uses the default @supabase/ssr cookie adapter so
 * PKCE OAuth state/verifier cookies are set correctly (custom document.cookie
 * handling caused bad_oauth_callback / state parameter missing).
 */
export function getSupabaseClient(rememberMe = true) {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: rememberMe,
    },
  });
}
