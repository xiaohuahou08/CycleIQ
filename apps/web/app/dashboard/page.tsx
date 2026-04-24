"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setEmail(user.email ?? "");
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <p className="text-gray-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">CycleIQ Dashboard</h1>
          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Welcome to CycleIQ</h2>
          <p className="mt-2 text-gray-700">Signed in as: {email ?? "Unknown"}</p>
        </div>
      </section>
    </main>
  );
}
