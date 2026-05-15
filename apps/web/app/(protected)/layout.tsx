"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import { UserMenu } from "@/components/auth/UserMenu";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth check
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
      } catch {
        router.replace("/login");
      } finally {
        setIsAuthLoading(false);
      }
    };
    void loadUser();
  }, [router]);

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
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
        <Sidebar email={email} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 lg:text-base">
                CycleIQ
              </p>
              <p className="hidden truncate text-xs text-gray-500 sm:block">
                Wheel Strategy Management
              </p>
            </div>
          </div>
          <UserMenu email={email} />
        </div>
        <main className="flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
