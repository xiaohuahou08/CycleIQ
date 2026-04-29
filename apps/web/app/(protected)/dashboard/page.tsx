"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTrade,
  getMetricsSummary,
  listTrades,
  type CreateTradeInput,
  type MetricsSummary,
  type Trade,
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import SummaryCards from "./components/SummaryCards";
import ActivePositionsTable from "./components/ActivePositionsTable";
import AddTradeModal from "./components/AddTradeModal";

export default function DashboardPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tickerSuggestions = useMemo(
    () =>
      Array.from(new Set(activeTrades.map((trade) => trade.ticker)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [activeTrades]
  );

  const loadData = useCallback(async (accessToken: string) => {
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
  }, []);

  useEffect(() => {
    if (token) {
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

  if (isAuthLoading) return null;

  return (
    <>
      <main className="flex-1 px-6 py-8">
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

        <div className="mt-6">
          <SummaryCards summary={summary} loading={summaryLoading} />
        </div>

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

      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
        tickerSuggestions={tickerSuggestions}
      />
    </>
  );
}
