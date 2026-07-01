"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/auth/user-profile";
import { UserMenu } from "@/components/auth/UserMenu";

export function AuthenticatedShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/login");
          return;
        }
        setEmail(session.user.email ?? null);
        setDisplayName(getUserDisplayName(session.user));
        setAvatarUrl(getUserAvatarUrl(session.user));
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-base font-semibold text-slate-900">
            CycleIQ
          </Link>
          <span className="truncate text-sm text-slate-500">{title}</span>
        </div>
        <UserMenu email={email} displayName={displayName} avatarUrl={avatarUrl} />
      </header>
      {children}
    </div>
  );
}
