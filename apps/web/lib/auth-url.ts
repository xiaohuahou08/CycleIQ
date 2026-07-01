import { resolveConfiguredAuthOrigin } from "@/lib/auth-origin";

/**
 * Origin used for Supabase OAuth / email redirect URLs.
 *
 * - **Browser:** always the current page origin so Vercel preview deploys
 *   (`*.vercel.app`) callback to themselves, not to `NEXT_PUBLIC_SITE_URL`.
 * - **Server:** `resolveConfiguredAuthOrigin()` (Vercel host on preview, canonical on prod).
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return resolveConfiguredAuthOrigin();
}

export function authCallbackUrl(nextPath?: string | null): string {
  const url = new URL("/auth/callback", getAuthRedirectOrigin() || "http://localhost:3000");
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}

export { oauthCallbackUrlForOrigin, resolveConfiguredAuthOrigin, resolveRequestOrigin } from "@/lib/auth-origin";
