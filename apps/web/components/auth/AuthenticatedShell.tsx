"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
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
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-base font-semibold text-gray-900">
            CycleIQ
          </Link>
          <span className="truncate text-sm text-gray-500">{title}</span>
        </div>
        <UserMenu email={email} />
      </header>
      {children}
    </div>
  );
}
