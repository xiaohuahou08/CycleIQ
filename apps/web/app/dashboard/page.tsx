"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  createTrade,
  getMetricsSummary,
  listTrades,
  type CreateTradeInput,
  type MetricsSummary,
  type Trade,
} from "@/lib/api/trades";
import Sidebar from "./components/Sidebar";
import SummaryCards from "./components/SummaryCards";
import ActivePositionsTable from "./components/ActivePositionsTable";
import AddTradeModal from "./components/AddTradeModal";

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
        setToken(session.access_token);
      } catch {
        router.replace("/login");
      } finally {
        setIsAuthLoading(false);
      }
    };
    void loadUser();
  }, [router]);

  // Load data once we have a token
  const loadData = useCallback(
    async (accessToken: string) => {
      setSummaryLoading(true);
      setTradesLoading(true);

      await Promise.allSettled([
        getMetricsSummary(accessToken)
          .then(setSummary)
          .catch(() => setSummary(null))
          .finally(() => setSummaryLoading(false)),

        listTrades(accessToken, { status: "OPEN" })
          .then(setActiveTrades)
          .catch(() => setActiveTrades([]))
          .finally(() => setTradesLoading(false)),
      ]);
    },
    []
  );

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadData(token);
    }
  }, [token, loadData]);

  const onLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const onSaveTrade = async (input: CreateTradeInput) => {
    if (!token) return;
    setSaveError(null);
    try {
      await createTrade(token, input);
      setModalOpen(false);
      void loadData(token);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save trade."
      );
    }
  };

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
        <Sidebar email={email} onLogout={onLogout} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-auto">
        {/* Mobile topbar */}
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

        <main className="flex-1 px-6 py-8">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Your wheel strategy at a glance
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setModalOpen(true);
              }}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add Trade
            </button>
          </div>

          {saveError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}

          {/* Summary cards */}
          <div className="mt-6">
            <SummaryCards summary={summary} loading={summaryLoading} />
          </div>

          {/* Active positions */}
          <div className="mt-6">
            <ActivePositionsTable
              trades={activeTrades}
              loading={tradesLoading}
              onAddTrade={() => {
                setSaveError(null);
                setModalOpen(true);
              }}
            />
          </div>
        </main>
      </div>

      {/* Add Trade modal */}
      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
      />
    </div>
  );
}

