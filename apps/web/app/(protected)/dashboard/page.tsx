"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardInsights,
  listTrades,
  type DashboardInsights as DashboardInsightsData,
  type Trade,
} from "@/lib/api/trades";
import PageHeader from "@/app/components/PageHeader";
import RefreshingSpinner from "@/app/components/RefreshingSpinner";
import { useTranslations } from "@/lib/i18n/locale-context";
import { useProtectedAuth } from "../auth-context";
import ActivePositionsTable from "./components/ActivePositionsTable";
import DashboardInsights from "./components/DashboardInsights";

export default function DashboardPage() {
  const { t } = useTranslations("dashboard");
  const { t: tCommon } = useTranslations("common");
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
      setLoadError(t("error.load"));
    }
    setTradesLoading(false);
  }, [t]);

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
          <PageHeader title={t("title")} description={t("description")} />
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
                      {tCommon("actions.retry")}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <DashboardInsights insights={insights} trades={allTrades} />
              <ActivePositionsTable trades={activeTrades} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
