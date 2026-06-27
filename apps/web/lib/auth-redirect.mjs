export function isProtectedRoute(pathname) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/trades") ||
    pathname.startsWith("/cycles") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings")
  );
}

export function isAuthRoute(pathname) {
  return pathname === "/login" || pathname === "/register";
}

const ALLOWED_POST_LOGIN_PREFIXES = [
  "/dashboard",
  "/trades",
  "/cycles",
  "/reports",
  "/settings",
  // Public page, but a valid post-login target for the upgrade flow
  // (e.g. /login?next=/pricing) so users return to pricing after signing in.
  "/pricing",
];

/**
 * When Supabase rejects redirectTo it falls back to Site URL with `?code=` on `/`.
 * Returns the callback path+query to relay, or null if no relay is needed.
 *
 * @param {string} pathname
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 * @returns {string | null}
 */
export function oauthCallbackRelayTarget(pathname, searchParams) {
  if (pathname === "/auth/callback") return null;
  const code = searchParams.get("code");
  if (!code) return null;
  const q = new URLSearchParams();
  searchParams.forEach((value, key) => q.set(key, value));
  const qs = q.toString();
  return qs ? `/auth/callback?${qs}` : "/auth/callback";
}

/**
 * @param {string} pathname
 * @param {Record<string, string | string[] | undefined>} params Next.js searchParams
 * @returns {string | null}
 */
export function oauthCallbackRelayFromRecord(pathname, params) {
  const code = params?.code;
  if (typeof code !== "string" || !code) return null;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) q.append(key, v);
    }
  }
  return oauthCallbackRelayTarget(pathname, q);
}

/**
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export function safeInternalRedirectPath(path) {
  if (path == null || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (isAuthRoute(trimmed)) return null;
  const ok = ALLOWED_POST_LOGIN_PREFIXES.some(
    (p) => trimmed === p || trimmed.startsWith(`${p}/`),
  );
  return ok ? trimmed : null;
}

/**
 * @param {string} pathname
 * @param {boolean} hasSession
 * @param {string | null | undefined} [authNextParam] query `next` when visiting /login or /register while signed in
 * @returns {string | null}
 */
export function resolveAuthRedirect(pathname, hasSession, authNextParam) {
  if (!hasSession && isProtectedRoute(pathname)) {
    const q = new URLSearchParams();
    q.set("next", pathname);
    return `/login?${q.toString()}`;
  }

  if (hasSession && isAuthRoute(pathname)) {
    const target = safeInternalRedirectPath(authNextParam);
    return target ?? "/dashboard";
  }

  return null;
}
