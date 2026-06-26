"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/auth/user-profile";
import { ProtectedAuthProvider } from "./auth-context";

export default function ProtectedLayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }
        setEmail(session.user.email ?? "");
        setDisplayName(getUserDisplayName(session.user));
        setAvatarUrl(getUserAvatarUrl(session.user));
        setToken(session.access_token);
      } catch {
        router.replace("/login");
      } finally {
        setIsAuthLoading(false);
      }
    };
    void loadUser();
  }, [router]);

  const onLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const contextValue = useMemo(
    () => ({ email, displayName, avatarUrl, token, isAuthLoading, onLogout }),
    [email, displayName, avatarUrl, token, isAuthLoading, onLogout]
  );

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="loading-spinner" aria-hidden />
        <p className="animate-fade-in text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <ProtectedAuthProvider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ProtectedAuthProvider>
  );
}
