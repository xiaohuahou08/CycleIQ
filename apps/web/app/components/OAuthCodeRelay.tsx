"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * When Supabase rejects redirectTo it falls back to Site URL with `?code=` on
 * `/` (not `/auth/callback`). The PKCE code must be exchanged on the page the
 * user actually landed on — redirecting to /auth/callback breaks the exchange.
 */
export default function OAuthCodeRelay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (pathname === "/auth/callback") return;

    const code = searchParams.get("code");
    if (!code) return;

    started.current = true;

    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login?error=oauth");
          return;
        }
        const next = safeInternalRedirectPath(searchParams.get("next")) ?? "/dashboard";
        router.replace(next);
        router.refresh();
      } catch {
        router.replace("/login?error=oauth");
      }
    })();
  }, [pathname, router, searchParams]);

  return null;
}
