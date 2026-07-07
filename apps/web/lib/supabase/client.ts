import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/env";

function createBrowserSupabaseClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
    },
  });
}

type BrowserSupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

let browserClient: BrowserSupabaseClient | undefined;

/**
 * Browser Supabase client. Uses the default @supabase/ssr cookie adapter so
 * PKCE OAuth state/verifier cookies are set correctly (custom document.cookie
 * handling caused bad_oauth_callback / state parameter missing).
 *
 * Singleton — multiple instances caused pricing upgrade to miss the session
 * after sign-in on a separate page.
 */
export function getSupabaseClient(_rememberMe = true) {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
}
