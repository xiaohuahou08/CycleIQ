export function isProtectedRoute(pathname) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/cycles") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/orders")
  );
}

export function isAuthRoute(pathname) {
  return pathname === "/login" || pathname === "/register";
}

const ALLOWED_POST_LOGIN_PREFIXES = [
  "/dashboard",
  "/cycles",
  "/reports",
  "/settings",
  "/orders",
];

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
