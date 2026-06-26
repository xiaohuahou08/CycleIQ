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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadData(token);
    }
  }, [token, loadData]);

  if (isAuthLoading) return null;

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
        <div className="w-full space-y-6">
          <DashboardInsights insights={insights} loading={tradesLoading} />
          <ActivePositionsTable trades={activeTrades} loading={tradesLoading} />
        </div>
      </main>
    </>
  );
}
