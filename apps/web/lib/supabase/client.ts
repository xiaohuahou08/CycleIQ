import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client. Uses the default @supabase/ssr cookie adapter so
 * PKCE OAuth state/verifier cookies are set correctly (custom document.cookie
 * handling caused bad_oauth_callback / state parameter missing).
 */
export function getSupabaseClient(rememberMe = true) {
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
