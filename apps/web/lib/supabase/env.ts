/**
 * Supabase project URL must be the API origin only (e.g. https://xxx.supabase.co).
 * A trailing /auth/v1/callback breaks OAuth — signInWithOAuth builds
 * .../auth/v1/authorize on top of the base URL.
 */
export function normalizeSupabaseProjectUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const { protocol, host } = new URL(withProto);
    return `${protocol}//${host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function getSupabaseProjectUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return raw ? normalizeSupabaseProjectUrl(raw) : undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

export function supabaseUrlHadPathSuffix(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const withProto = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
    const pathname = new URL(withProto).pathname;
    return pathname !== "" && pathname !== "/";
  } catch {
    return raw.includes("/");
  }
}
