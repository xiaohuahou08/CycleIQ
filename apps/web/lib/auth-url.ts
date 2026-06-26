/**
 * Origin used for Supabase OAuth / email redirect URLs.
 * Prefer NEXT_PUBLIC_SITE_URL so callbacks land on the canonical domain (cycleiq.xyz),
 * not a Vercel *.vercel.app host — must match Supabase Auth → URL Configuration.
 */
export function getAuthRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function authCallbackUrl(nextPath?: string | null): string {
  const origin = getAuthRedirectOrigin() || "http://localhost:3000";
  const url = new URL("/auth/callback", origin);
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}
