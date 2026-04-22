import { createBrowserClient } from "@supabase/ssr";
import { envPublic } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const url = envPublic.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    envPublic.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publicKey) return null;

  // Use cookie-based auth so `middleware.ts` (SSR) can read the session.
  return createBrowserClient(url, publicKey);
}

