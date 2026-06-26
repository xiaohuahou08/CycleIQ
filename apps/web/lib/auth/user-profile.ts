import type { User } from "@supabase/supabase-js";

function readImageUrl(record: Record<string, unknown> | undefined): string | null {
  if (!record) return null;
  for (const key of ["avatar_url", "picture", "avatar"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Avatar URL from Supabase Auth (Google OAuth stores picture in user_metadata). */
export function getUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null;

  const fromMeta = readImageUrl(user.user_metadata as Record<string, unknown> | undefined);
  if (fromMeta) return fromMeta;

  const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
  return readImageUrl(googleIdentity?.identity_data as Record<string, unknown> | undefined);
}

export function getUserDisplayName(user: User | null | undefined): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  for (const key of ["full_name", "name"]) {
    const value = meta?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
  const idData = googleIdentity?.identity_data as Record<string, unknown> | undefined;
  const fromIdentity = idData?.full_name ?? idData?.name;
  if (typeof fromIdentity === "string" && fromIdentity.trim()) {
    return fromIdentity.trim();
  }
  return null;
}

export function getUserInitial(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const fromName = displayName?.trim()?.[0];
  if (fromName) return fromName.toUpperCase();
  const fromEmail = email?.trim()?.[0];
  if (fromEmail) return fromEmail.toUpperCase();
  return "?";
}
