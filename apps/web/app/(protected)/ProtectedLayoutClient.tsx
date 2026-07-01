"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { ToastProvider } from "@/app/components/Toast";
import { iconMd, iconStroke } from "@/app/components/icons";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const applySession = useCallback((session: Session) => {
    setEmail(session.user.email ?? "");
    setDisplayName(getUserDisplayName(session.user));
    setAvatarUrl(getUserAvatarUrl(session.user));
    setToken(session.access_token);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) {
          router.replace("/login");
          return;
        }
        applySession(session);
      } catch {
        if (active) router.replace("/login");
      } finally {
        if (active) setIsAuthLoading(false);
      }
    };
    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        setToken(null);
        router.replace("/login");
        return;
      }
      applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, applySession]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  const onLogout = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const contextValue = useMemo(
    () => ({ email, displayName, avatarUrl, token, isAuthLoading, onLogout }),
    [email, displayName, avatarUrl, token, isAuthLoading, onLogout]
  );

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 app-page-bg">
        <div className="loading-spinner" aria-hidden />
        <p role="status" aria-live="polite" className="animate-fade-in text-sm text-slate-500">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <ProtectedAuthProvider value={contextValue}>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden app-page-bg">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          <div className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Mobile top bar */}
            <div className="flex h-12 shrink-0 items-center border-b border-border bg-surface px-4 md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                aria-label="Open menu"
              >
                <Menu className={iconMd} strokeWidth={iconStroke} aria-hidden />
              </button>
            </div>
            {children}
          </div>
        </div>
      </ToastProvider>
    </ProtectedAuthProvider>
  );
}
