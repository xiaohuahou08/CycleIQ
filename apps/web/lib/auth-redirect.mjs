export function isProtectedRoute(pathname) {
  return pathname.startsWith("/dashboard");
}

export function isAuthRoute(pathname) {
  return pathname === "/login" || pathname === "/register";
}

export function resolveAuthRedirect(pathname, hasSession) {
  if (!hasSession && isProtectedRoute(pathname)) {
    return "/login";
  }

  if (hasSession && isAuthRoute(pathname)) {
    return "/dashboard";
  }

  return null;
}
