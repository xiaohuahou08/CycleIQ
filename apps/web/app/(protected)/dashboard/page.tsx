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
      void loadData(token);
    }
  }, [token, loadData]);

  if (isAuthLoading) return null;

  return (
    <>
      <main className="flex-1 bg-gray-100/80 px-6 py-8">
        <div>
          <DashboardInsights insights={insights} loading={tradesLoading} />
        </div>

        <div className="mt-6">
          <ActivePositionsTable trades={activeTrades} loading={tradesLoading} />
        </div>
      </main>
    </>
  );
}
