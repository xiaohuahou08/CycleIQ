"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardInsights,
  listTrades,
  type DashboardInsights as DashboardInsightsData,
  type Trade,
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import ActivePositionsTable from "./components/ActivePositionsTable";
import DashboardInsights from "./components/DashboardInsights";

export default function DashboardPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [insights, setInsights] = useState<DashboardInsightsData | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [focusTab, setFocusTab] = useState<"OVERVIEW" | "ACTIVE" | "INCOME">("OVERVIEW");
  const activeTrades = useMemo(
    () => allTrades.filter((trade) => trade.status === "OPEN"),
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

  if (isAuthLoading) return null;

  return (
    <>
      <main className="flex-1 bg-gray-100/80 px-6 py-8">
        <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Your wheel strategy at a glance</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live analytics
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Total Trades</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{allTrades.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Active Trades</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{activeTrades.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Total Premium</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${(insights?.kpis.total_premium ?? 0).toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Realized P&L</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${(insights?.kpis.realized_pnl ?? 0).toFixed(0)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["OVERVIEW", "ACTIVE", "INCOME"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFocusTab(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  focusTab === item
                    ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {item[0] + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <DashboardInsights insights={insights} loading={tradesLoading} />
        </div>

        <div className="mt-6">
          <ActivePositionsTable trades={activeTrades} loading={tradesLoading} />
        </div>
      </main>
    </>
  );
}
