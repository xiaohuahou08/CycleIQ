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
      <main className="flex min-h-screen items-center justify-center bg-[#0B0E11]">
        <p className="text-[#94A3B8] font-medium animate-pulse">Loading Premium Ledger…</p>
      </main>
    );
  }

  return (
    <ProtectedAuthProvider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-[#0B0E11] text-[#E1E2E7]">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
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
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
          />
        </div>

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header — always visible */}
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#2D3439] bg-[#111417]/80 backdrop-blur-xl px-8">
            <div className="flex items-center gap-4">
              {/* Hamburger for mobile */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1D2023] lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-[#1D2023] p-2 rounded-lg border border-[#2D3439]">
                  <span className="text-[#8B5CF6] text-lg font-bold select-none">⚡</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#E1E2E7]">{pageTitle}</h1>
                  <p className="text-[10px] text-[#94A3B8] opacity-60">Your options premium portfolio overview</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Live Status Badge */}
              <div className="flex items-center gap-2 bg-[#22C55E]/10 text-[#22C55E] px-4 py-2 rounded-full border border-[#22C55E]/20 select-none">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                <span className="text-xs font-bold tracking-wide">Live Status</span>
              </div>

              <div className="flex items-center gap-4 border-l border-[#2D3439] pl-6">
                {email && (
                  <span className="hidden text-xs text-[#94A3B8] font-medium sm:block">{email}</span>
                )}
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="rounded-xl border border-[#2D3439] bg-[#111417]/80 px-4 py-2 text-xs font-bold text-[#94A3B8] hover:text-[#E1E2E7] hover:bg-[#1D2023] transition-all duration-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          {/* Scrollable page content */}
          <div className="flex-1 overflow-auto bg-[#0B0E11] text-[#E1E2E7]">
            {children}
          </div>
        </div>
      </div>
    </ProtectedAuthProvider>
  );
}
