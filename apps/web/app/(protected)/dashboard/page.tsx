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
import SummaryCards from "./components/SummaryCards";
import ActivePositionsTable from "./components/ActivePositionsTable";
import AddTradeModal from "./components/AddTradeModal";

export default function DashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Get token for API calls
  useEffect(() => {
    const loadToken = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setToken(session.access_token);
        }
      } catch {
        // Auth already handled in layout
      }
    };
    void loadToken();
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

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
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

      {/* Add Trade modal */}
      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
      />
    </>
  );
}
