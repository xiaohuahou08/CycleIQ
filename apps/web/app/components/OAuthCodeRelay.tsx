"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { oauthCallbackRelayTarget } from "@/lib/auth-redirect.mjs";

/**
 * OAuth starts on the server (/auth/google) with HttpOnly PKCE cookies. When
 * Supabase lands `?code=` on `/` (Site URL fallback), relay to /auth/callback
 * so the Route Handler can exchange the code — client-side exchange cannot
 * read HttpOnly verifier cookies.
 */
export default function OAuthCodeRelay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (pathname === "/auth/callback") return;

    const oauthError = searchParams.get("error_code") ?? searchParams.get("error");
    if (
      oauthError === "bad_oauth_callback" ||
      oauthError === "bad_oauth_state" ||
      searchParams.get("error") === "invalid_request"
    ) {
      started.current = true;
      router.replace("/login?error=oauth");
      return;
    }

    const relay = oauthCallbackRelayTarget(pathname, searchParams);
    if (!relay) return;

    started.current = true;
    router.replace(relay);
  }, [pathname, router, searchParams]);

  return null;
}
