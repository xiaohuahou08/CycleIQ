"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ProtectedAuthProvider } from "./auth-context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trades",
  "/cycles": "Cycles",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = PAGE_TITLES[pathname] ?? "CycleIQ";

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
    () => ({ email, token, isAuthLoading, onLogout }),
    [email, token, isAuthLoading, onLogout]
  );

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <ProtectedAuthProvider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header — always visible */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-3">
              {/* Hamburger for mobile */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
              <h1 className="text-sm font-semibold text-slate-900">{pageTitle}</h1>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="hidden rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 lg:inline-flex"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? "»" : "«"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {email && (
                <span className="hidden text-xs text-slate-500 sm:block">{email}</span>
              )}
              <button
                type="button"
                onClick={() => void onLogout()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Sign out
              </button>
            </div>
          </header>

          {/* Scrollable page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </ProtectedAuthProvider>
  );
}
