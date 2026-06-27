/**
 * Resolve the public origin for OAuth redirectTo (must match Supabase Redirect URLs).
 *
 * @see https://supabase.com/docs/guides/auth/redirect-urls — Vercel previews use
 *      `https://*-.vercel.app/**` in the Supabase allowlist (not `https://*.vercel.app/**`).
 */

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

/** Browser or build-time origin when request headers are unavailable. */
export function resolveConfiguredAuthOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;

  if (vercelEnv === "production" && site) {
    return normalizeOrigin(site);
  }
  if (vercel) {
    return normalizeOrigin(vercel);
  }
  if (site) {
    return normalizeOrigin(site);
  }
  return "http://localhost:3000";
}

/** Origin from an incoming Route Handler / middleware request (Vercel sets x-forwarded-host). */
export function resolveRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) return `${forwardedProto}://${host}`;
  }
  return new URL(request.url).origin;
}

/** OAuth callback URL (path only, no query — Supabase allowlist is path-based). */
export function oauthCallbackUrlForOrigin(origin: string): string {
  const base = normalizeOrigin(origin) || "http://localhost:3000";
  return new URL("/auth/callback", base).toString();
}
