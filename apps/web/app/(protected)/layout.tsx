"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ProtectedAuthProvider } from "./auth-context";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const contextValue = useMemo(
    () => ({ email, token, isAuthLoading, onLogout }),
    [email, token, isAuthLoading]
  );

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <ProtectedAuthProvider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar email={email} onLogout={() => void onLogout()} />
        </div>

        <div className="flex flex-1 flex-col overflow-auto">
          <div className="flex items-center border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mr-3 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <span className="text-sm font-semibold text-gray-900">CycleIQ</span>
          </div>
          {children}
        </div>
      </div>
    </ProtectedAuthProvider>
  );
}
