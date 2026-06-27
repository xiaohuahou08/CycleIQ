import { authCallbackUrl } from "@/lib/auth-url";

/** Cookie for post-OAuth redirect — readable on server /auth/callback and client fallback. */
export const AUTH_NEXT_COOKIE = "cycleiq_auth_next";

/** Stash intended path before OAuth (Supabase allowlist matches path only, not ?next=). */
export function stashAuthNextPath(path: string | null | undefined): void {
  if (typeof window === "undefined" || !path) return;
  try {
    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=600; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function readAuthNextFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const prefix = `${AUTH_NEXT_COOKIE}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

/** Read and clear stashed post-OAuth path in the browser. */
export function consumeAuthNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const value = readAuthNextFromCookieHeader(document.cookie);
  if (value) {
    document.cookie = `${AUTH_NEXT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
  return value;
}

/** Supabase redirectTo for OAuth — never include query params (allowlist is path-only). */
export function oauthRedirectTo(): string {
  return authCallbackUrl();
}
