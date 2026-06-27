import { getSiteUrl } from "@/lib/seo/site";

/**
 * Origin used for Supabase OAuth / email redirect URLs.
 *
 * - **Browser:** always the current page origin so Vercel preview deploys
 *   (`*.vercel.app`) callback to themselves, not to `NEXT_PUBLIC_SITE_URL`
 *   (which is baked into the client bundle for production canonical domain).
 * - **Server:** same rules as SEO `getSiteUrl()` (production → canonical,
 *   preview → Vercel host, local → localhost).
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getSiteUrl();
}

export function authCallbackUrl(nextPath?: string | null): string {
  const origin = getAuthRedirectOrigin() || "http://localhost:3000";
  const url = new URL("/auth/callback", origin);
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}
