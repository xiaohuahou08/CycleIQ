"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardInsights,
  listTrades,
  type DashboardInsights as DashboardInsightsData,
  type Trade,
} from "@/lib/api/trades";
import PageHeader from "@/app/components/PageHeader";
import RefreshButton from "@/app/components/RefreshButton";
import RefreshingSpinner from "@/app/components/RefreshingSpinner";
import { useProtectedAuth } from "../auth-context";
import ActivePositionsTable from "./components/ActivePositionsTable";
import DashboardInsights from "./components/DashboardInsights";

export default function DashboardPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [insights, setInsights] = useState<DashboardInsightsData | null>(null);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeTrades = useMemo(
    () => allTrades.filter((trade) => trade.status === "OPEN"),
    [allTrades]
  );

  const loadData = useCallback(async (accessToken: string) => {
    setTradesLoading(true);
    setLoadError(null);

    const [tradesRes, insightsRes] = await Promise.allSettled([
      listTrades(accessToken),
      getDashboardInsights(accessToken),
    ]);

    setAllTrades(tradesRes.status === "fulfilled" ? tradesRes.value : []);
    setInsights(insightsRes.status === "fulfilled" ? insightsRes.value : null);

    if (tradesRes.status === "rejected" && insightsRes.status === "rejected") {
      const reason = tradesRes.reason;
      setLoadError(
        reason instanceof Error ? reason.message : "Failed to load dashboard data."
      );
    }
    setTradesLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadData(token);
    }
  }, [token, loadData]);

  if (isAuthLoading) return null;

  return (
    <>
      <main className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="w-full space-y-6">
          <PageHeader
            title="Dashboard"
            description="Your wheel strategy at a glance"
            actions={
              token ? (
                <RefreshButton loading={tradesLoading} onClick={() => void loadData(token)} />
              ) : null
            }
          />
          {tradesLoading ? (
            <RefreshingSpinner className="flex min-h-[40vh] w-full items-center justify-center" />
          ) : (
            <>
              {loadError ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <span>{loadError}</span>
                  {token ? (
                    <button
                      type="button"
                      onClick={() => void loadData(token)}
                      className="shrink-0 font-semibold underline-offset-2 hover:underline"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
              <DashboardInsights insights={insights} />
              <ActivePositionsTable trades={activeTrades} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
