"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Client fallback when Supabase lands PKCE `code` on Site URL root (or any
 * page other than /auth/callback) instead of redirectTo.
 */
export default function OAuthCodeRelay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/auth/callback") return;
    const code = searchParams.get("code");
    if (!code) return;
    const qs = searchParams.toString();
    router.replace(qs ? `/auth/callback?${qs}` : "/auth/callback");
  }, [pathname, router, searchParams]);

  return null;
}
