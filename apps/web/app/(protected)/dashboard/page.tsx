"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTrade,
  getDashboardInsights,
  listTrades,
  type CreateTradeInput,
  type DashboardInsights,
  type Trade,
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import ActivePositionsTable from "./components/ActivePositionsTable";
import AddTradeModal from "./components/AddTradeModal";
import DashboardInsights from "./components/DashboardInsights";

export default function DashboardPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeTrades = useMemo(
    () => allTrades.filter((trade) => trade.status === "OPEN"),
    [allTrades]
  );

  const tickerSuggestions = useMemo(
    () =>
      Array.from(new Set(allTrades.map((trade) => trade.ticker)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [allTrades]
  );

  const loadData = useCallback(async (accessToken: string) => {
    setTradesLoading(true);

    await Promise.allSettled([
      listTrades(accessToken).then(setAllTrades).catch(() => setAllTrades([])),
      getDashboardInsights(accessToken).then(setInsights).catch(() => setInsights(null)),
    ]).finally(() => setTradesLoading(false));
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
          <DashboardInsights insights={insights} loading={tradesLoading} />
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
