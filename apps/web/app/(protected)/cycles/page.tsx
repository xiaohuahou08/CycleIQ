"use client";

import { useEffect, useMemo, useState } from "react";
import { listCycles, listTrades, type CycleSummary, type Trade } from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

function fmtMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stateBadgeStyle(state: string): string {
  if (state === "IDLE") return "bg-gray-100 text-gray-700";
  if (state === "CSP_OPEN") return "bg-blue-100 text-blue-700";
  if (state === "STOCK_HELD") return "bg-purple-100 text-purple-700";
  if (state === "CC_OPEN") return "bg-amber-100 text-amber-700";
  if (state === "EXIT") return "bg-green-100 text-green-700";
  return "bg-slate-100 text-slate-700";
}

const NOW_TS = Date.now();

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(ticker)}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function TickerLogo({ ticker, size = "sm" }: { ticker: string; size?: "sm" | "lg" }) {
  const [urlIndex, setUrlIndex] = useState(0);
  const dim = size === "lg" ? "h-10 w-10 rounded-xl" : "h-6 w-6 rounded-lg";
  const fallbackDim = size === "lg" ? "h-10 w-10 rounded-xl text-sm" : "h-6 w-6 rounded-lg text-[10px]";

  if (urlIndex >= LOGO_URL_BUILDERS.length) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-blue-100 font-bold text-blue-700 ${fallbackDim}`}
      >
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={LOGO_URL_BUILDERS[urlIndex](ticker)}
      alt=""
      className={`object-cover ring-1 ring-gray-100 ${dim}`}
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

function MoneyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-gray-400" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v7M12 8.2c0-.8-.9-1.4-2-1.4s-2 .6-2 1.4.9 1.3 2 1.3 2 .5 2 1.4-.9 1.4-2 1.4-2-.6-2-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

interface WheelSummary extends CycleSummary {
  source_cycle_id: string;
  trades: Trade[];
}

function splitCycleIntoWheels(cycle: CycleSummary, linkedTrades: Trade[]): WheelSummary[] {
  const sorted = linkedTrades
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  if (sorted.length === 0) {
    return [{ ...cycle, source_cycle_id: cycle.id, trades: [] }];
  }

  const putStartIndexes = sorted
    .map((trade, index) => (trade.option_type === "PUT" ? index : -1))
    .filter((index) => index >= 0);
  if (putStartIndexes.length <= 1) {
    const hasOpenTrade = sorted.some((t) => t.status === "OPEN");
    // Derive completed state from trade statuses so that expiring/closing the last
    // open leg moves the cycle out of "Active" even when the backend state hasn't
    // been updated yet. Preserve STOCK_HELD — the user still holds shares.
    const derivedState =
      !hasOpenTrade && cycle.state !== "STOCK_HELD" ? "EXIT" : cycle.state;
    return [{ ...cycle, source_cycle_id: cycle.id, trades: sorted, state: derivedState }];
  }

  return putStartIndexes.map((startIndex, idx) => {
    const endIndex = putStartIndexes[idx + 1] ?? sorted.length;
    const wheelTrades = sorted.slice(startIndex, endIndex);
    const latestTradeDate = wheelTrades[wheelTrades.length - 1]?.trade_date ?? cycle.updated_at;
    return {
      ...cycle,
      id: `${cycle.id}:${idx}`,
      state: wheelTrades.some((trade) => trade.status === "OPEN") ? "CSP_OPEN" : "EXIT",
      created_at: wheelTrades[0]?.trade_date ?? cycle.created_at,
      updated_at: latestTradeDate,
      source_cycle_id: cycle.id,
      trades: wheelTrades,
    };
  });
}

export default function CyclesPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWheelId, setSelectedWheelId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"WHEELS" | "CC_COST_BASIS" | "CSP_PREMIUM" | "DTE_TIMELINE">(
    "WHEELS"
  );
  const [tab, setTab] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");
  const [timeRange, setTimeRange] = useState<"ALL" | "WEEK" | "MONTH" | "YEAR">("ALL");
  const [sortBy, setSortBy] = useState<"LATEST" | "PREMIUM" | "TICKER">("LATEST");
  const [searchTicker, setSearchTicker] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([listCycles(token), listTrades(token)])
      .then(([cycleRows, tradeRows]) => {
        setCycles(cycleRows);
        setTrades(tradeRows);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const tradesByCycle = useMemo(() => {
    return trades.reduce<Record<string, Trade[]>>((acc, trade) => {
      if (!trade.cycle_id) return acc;
      if (!acc[trade.cycle_id]) acc[trade.cycle_id] = [];
      acc[trade.cycle_id].push(trade);
      return acc;
    }, {});
  }, [trades]);

  const wheels = useMemo(
    () => cycles.flatMap((cycle) => splitCycleIntoWheels(cycle, tradesByCycle[cycle.id] ?? [])),
    [cycles, tradesByCycle]
  );

  const sortedCycles = useMemo(
    () =>
      wheels
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
            new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        ),
    [wheels]
  );

  const activeCycles = useMemo(
    () => sortedCycles.filter((cycle) => cycle.state !== "EXIT"),
    [sortedCycles]
  );
  const completedCycles = useMemo(
    () => sortedCycles.filter((cycle) => cycle.state === "EXIT"),
    [sortedCycles]
  );
  const tabCycles =
    tab === "ACTIVE" ? activeCycles : tab === "COMPLETED" ? completedCycles : sortedCycles;
  const visibleCycles = useMemo(() => {
    const rangeMs =
      timeRange === "WEEK"
        ? 7 * 24 * 60 * 60 * 1000
        : timeRange === "MONTH"
          ? 30 * 24 * 60 * 60 * 1000
          : timeRange === "YEAR"
            ? 365 * 24 * 60 * 60 * 1000
            : null;

    const searched = tabCycles.filter((cycle) =>
      cycle.ticker.toLowerCase().includes(searchTicker.trim().toLowerCase())
    );

    const ranged =
      rangeMs == null
        ? searched
        : searched.filter((cycle) => {
            const ts = new Date(cycle.updated_at ?? cycle.created_at ?? 0).getTime();
            return Number.isFinite(ts) && NOW_TS - ts <= rangeMs;
          });

    return ranged.slice().sort((a, b) => {
      if (sortBy === "TICKER") return a.ticker.localeCompare(b.ticker);
      if (sortBy === "PREMIUM") {
        const aPremium = a.trades.reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);
        const bPremium = b.trades.reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);
        return bPremium - aPremium;
      }
      return (
        new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
        new Date(a.updated_at ?? a.created_at ?? 0).getTime()
      );
    });
  }, [searchTicker, sortBy, tabCycles, timeRange, tradesByCycle]);

  const ccCostBasisRows = useMemo(() => {
    const grouped = trades.reduce<Record<string, Trade[]>>((acc, trade) => {
      if (!acc[trade.ticker]) acc[trade.ticker] = [];
      acc[trade.ticker].push(trade);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([ticker, tickerTrades]) => {
        const assignedPuts = tickerTrades.filter(
          (t) =>
            t.option_type === "PUT" &&
            t.status === "ASSIGNED" &&
            t.stock_cost_basis_per_share != null &&
            Number.isFinite(t.stock_cost_basis_per_share)
        );
        if (assignedPuts.length === 0) return null;

        const assignedShares = assignedPuts.reduce((sum, t) => sum + t.contracts * 100, 0);
        if (assignedShares <= 0) return null;

        const weightedInitialCost =
          assignedPuts.reduce(
            (sum, t) => sum + (t.stock_cost_basis_per_share ?? 0) * t.contracts * 100,
            0
          ) / assignedShares;

        const ccPremiumTotal = tickerTrades
          .filter((t) => t.option_type === "CALL")
          .reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);

        const reductionPerShare = ccPremiumTotal / assignedShares;
        const currentCost = Math.max(0, weightedInitialCost - reductionPerShare);
        const reductionPct =
          weightedInitialCost > 0 ? (reductionPerShare / weightedInitialCost) * 100 : 0;

        const recentTradeDate = tickerTrades
          .map((t) => new Date(t.trade_date).getTime())
          .filter((ts) => Number.isFinite(ts))
          .sort((a, b) => b - a)[0];

        return {
          ticker,
          initialCost: weightedInitialCost,
          currentCost,
          ccPremiumTotal,
          assignedShares,
          ccPositions: tickerTrades.filter((t) => t.option_type === "CALL").length,
          reductionPct,
          recentTradeDate: recentTradeDate ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .filter((row) => row.ticker.toLowerCase().includes(searchTicker.trim().toLowerCase()))
      .sort((a, b) => b.reductionPct - a.reductionPct);
  }, [searchTicker, trades]);

  const ccHeadline = useMemo(() => {
    const tickersTracked = ccCostBasisRows.length;
    const totalCcPremium = ccCostBasisRows.reduce((sum, row) => sum + row.ccPremiumTotal, 0);
    const avgReduction =
      tickersTracked > 0
        ? ccCostBasisRows.reduce((sum, row) => sum + row.reductionPct, 0) / tickersTracked
        : 0;
    return { tickersTracked, totalCcPremium, avgReduction };
  }, [ccCostBasisRows]);

  const selectedWheel = useMemo(
    () => visibleCycles.find((cycle) => cycle.id === selectedWheelId) ?? null,
    [selectedWheelId, visibleCycles]
  );
  const selectedWheelLegs = useMemo(
    () =>
      selectedWheel
        ? selectedWheel.trades
        : [],
    [selectedWheel]
  );

  if (isAuthLoading) return null;

  return (
    <main className="flex-1 bg-gray-100/80 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Cycle</h1>
              <p className="mt-1 text-sm text-gray-500">
                {viewTab === "CC_COST_BASIS"
                  ? "See how covered call premium reduces your cost basis"
                  : "Visual lifecycle of every wheel strategy"}
              </p>
            </div>
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 text-xs">
              {(
                [
                  ["WHEELS", "Wheels"],
                  ["CC_COST_BASIS", "CC Cost Basis"],
                  ["CSP_PREMIUM", "CSP Premium"],
                  ["DTE_TIMELINE", "DTE Timeline"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewTab(key)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    viewTab === key
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-gray-500 hover:bg-white hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {viewTab === "CC_COST_BASIS" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Tickers Tracked</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{ccHeadline.tickersTracked}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Total CC Premium</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${ccHeadline.totalCcPremium.toFixed(0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Avg Reduction</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{ccHeadline.avgReduction.toFixed(1)}%</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Active Wheels</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{activeCycles.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{completedCycles.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Total Premium</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  $
                  {sortedCycles
                    .reduce(
                      (sum, cycle) =>
                        sum +
                        cycle.trades.reduce(
                          (tradeSum, trade) => tradeSum + trade.premium * trade.contracts * 100,
                          0
                        ),
                      0
                    )
                    .toFixed(0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">Ticker</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {new Set(sortedCycles.map((cycle) => cycle.ticker)).size}
                </p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
            No cycles yet. Create trades to auto-link cycles.
          </div>
        ) : viewTab === "CC_COST_BASIS" ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="relative min-w-[220px] max-w-sm">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  🔎
                </span>
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  placeholder="Search ticker..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-gray-300 focus:bg-white"
                />
              </div>
            </div>
            {ccCostBasisRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-500">
                No assigned positions available for CC cost basis yet.
              </div>
            ) : (
              ccCostBasisRows.map((row) => (
                <div key={row.ticker} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                        ↘
                      </span>
                      <span className="text-base font-semibold text-gray-900">{row.ticker}</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {row.reductionPct.toFixed(1)}% reduced
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Initial Cost</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">${row.initialCost.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500">per share</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600">Current Cost</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-700">${row.currentCost.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-600">per share</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Premium Received</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">${row.ccPremiumTotal.toFixed(0)}</p>
                      <p className="text-[10px] text-gray-500">total</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">CC Positions</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{row.ccPositions}</p>
                      <p className="text-[10px] text-gray-500">{row.assignedShares} shares</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-center text-[10px] uppercase tracking-wide text-gray-500">
                      Cost Basis Over Time
                    </p>
                    <div className="mt-3 flex items-end justify-center gap-28">
                      <div className="w-8 rounded-t-md bg-slate-300" style={{ height: "140px" }} />
                      <div
                        className="w-8 rounded-t-md bg-emerald-500"
                        style={{
                          height: `${Math.max(
                            20,
                            Math.min(140, (row.currentCost / Math.max(row.initialCost, 1)) * 140)
                          )}px`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-20 text-[10px] text-gray-500">
                      <span>Purchase</span>
                      <span>{fmtDate(new Date(row.recentTradeDate).toISOString().slice(0, 10))}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : viewTab !== "WHEELS" ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
            {viewTab === "CSP_PREMIUM" ? "CSP Premium view is coming next." : "DTE Timeline view is coming next."}
          </div>
        ) : selectedWheel ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex h-[58px] items-center justify-between border-b border-gray-200 bg-[#f5f8f8] px-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWheelId(null)}
                  className="rounded-full p-1 text-gray-500 hover:bg-white hover:text-gray-700"
                  title="Back"
                >
                  ←
                </button>
                <TickerLogo ticker={selectedWheel.ticker} size="lg" />
                <div>
                  <p className="text-[26px] font-semibold leading-none text-gray-900">
                    {selectedWheel.ticker} Wheel
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    {selectedWheel.trades.length} legs ·{" "}
                    {selectedWheel.trades.filter((t) => t.option_type === "PUT").length} CSP
                    {" · "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (selectedWheel.trades
                          .filter((t) => t.status === "OPEN")
                          .map((t) => new Date(t.expiry).getTime())
                          .sort((a, b) => a - b)[0] - NOW_TS) /
                          (1000 * 60 * 60 * 24)
                      )
                    ) || 0}
                    d
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MoneyIcon />
                  <span>
                    $
                    {fmtMoney(
                      selectedWheel.trades.reduce(
                        (sum, t) => sum + t.premium * t.contracts * 100,
                        0
                      )
                    )}
                  </span>
                </span>
                <span>
                  {Math.max(
                    0,
                    Math.ceil(
                      (selectedWheel.trades
                        .filter((t) => t.status === "OPEN")
                        .map((t) => new Date(t.expiry).getTime())
                        .sort((a, b) => a - b)[0] - NOW_TS) /
                        (1000 * 60 * 60 * 24)
                    )
                  ) || 0}d
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadgeStyle(selectedWheel.state)}`}
                >
                  {selectedWheel.state === "EXIT" ? "Completed" : "Active"}
                </span>
              </div>
            </div>
            <div className="relative h-[455px] bg-[#fcfdfd]">
              <div className="absolute left-1/2 top-[60%] h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#e9eeef]" />
              <div className="absolute left-1/2 top-[60%] h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300 bg-emerald-50 shadow-sm flex flex-col items-center justify-center gap-0.5">
                <TickerLogo ticker={selectedWheel.ticker} />
                <div className="text-[11px] font-semibold text-gray-900">{selectedWheel.ticker}</div>
                <div className="text-[10px] font-medium text-emerald-700">
                  +$
                  {selectedWheel.trades
                    .reduce((sum, t) => sum + t.premium * t.contracts * 100, 0)
                    .toFixed(2)}
                </div>
              </div>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {selectedWheelLegs.map((_, idx) => {
                  const count = selectedWheelLegs.length;
                  const step = count > 1 ? 22 / (count - 1) : 0;
                  const xPct = 39 + idx * step;
                  return (
                    <line
                      key={`line-${idx}`}
                      x1={`${xPct}%`}
                      y1="154"
                      x2="50%"
                      y2="286"
                      stroke="#e3e8ea"
                      strokeDasharray="3 5"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              {selectedWheelLegs.map((trade, idx) => {
                const count = selectedWheelLegs.length;
                const step = count > 1 ? 22 / (count - 1) : 0;
                const xPct = 39 + idx * step;
                return (
                  <div
                    key={trade.id}
                    className="absolute top-[70px]"
                    style={{ left: `${xPct}%`, transform: "translateX(-50%)" }}
                  >
                    <div
                      className={`relative w-[176px] rounded-xl border bg-white px-3 py-2 shadow-sm ${
                        trade.option_type === "PUT" ? "border-[#c7b8ef]" : "border-[#9fd8ca]"
                      }`}
                    >
                      <span className="absolute -left-2 -top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-[9px] font-semibold text-gray-500">
                        {idx + 1}
                      </span>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                        {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
                      </p>
                      <p className="mt-1 text-[30px] font-semibold leading-none text-gray-900">
                        ${trade.strike.toFixed(0)}
                      </p>
                      <p className="text-[11px] font-medium text-emerald-700">
                        +${(trade.premium * trade.contracts * 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-gray-500">{fmtDate(trade.expiry)}</p>
                      <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {trade.status}
                      </span>
                    </div>
                    {idx < count - 1 && <span className="absolute -right-5 top-[52px] text-emerald-600">→</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                    🔎
                  </span>
                  <input
                    type="text"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                    placeholder="Search by ticker..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-gray-300 focus:bg-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["ALL", "ACTIVE", "COMPLETED"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        tab === item
                          ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {item === "ALL"
                        ? `All (${sortedCycles.length})`
                        : item === "ACTIVE"
                          ? `Active (${activeCycles.length})`
                          : `Completed (${completedCycles.length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
                {(["ALL", "WEEK", "MONTH", "YEAR"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTimeRange(item)}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      timeRange === item
                        ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {item === "ALL" ? "All Time" : item[0] + item.slice(1).toLowerCase()}
                  </button>
                ))}
                {(["LATEST", "PREMIUM", "TICKER"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSortBy(item)}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      sortBy === item
                        ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {item[0] + item.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {visibleCycles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-500">
                  No cycles in this tab yet.
                </div>
              ) : (
                visibleCycles.map((cycle) => {
                  const linkedTrades = cycle.trades;
                  const totalPremium = linkedTrades.reduce(
                    (sum, trade) => sum + trade.premium * trade.contracts * 100,
                    0
                  );
                  const openCount = linkedTrades.filter((trade) => trade.status === "OPEN").length;
                  const sortedLegs = linkedTrades
                    .slice()
                    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
                  const nearestOpenExpiry = linkedTrades
                    .filter((trade) => trade.status === "OPEN")
                    .map((trade) => new Date(trade.expiry).getTime())
                    .filter((ts) => Number.isFinite(ts))
                    .sort((a, b) => a - b)[0];
                  const dte =
                    nearestOpenExpiry != null
                      ? Math.max(0, Math.ceil((nearestOpenExpiry - NOW_TS) / (1000 * 60 * 60 * 24)))
                      : null;

                  return (
                    <div
                      key={cycle.id}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={cycle.ticker} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-gray-900">{cycle.ticker}</span>
                              <span className="text-xs text-gray-500">
                                {linkedTrades.length} legs · {openCount} open
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-xs text-gray-500">
                          <span>${Math.abs(totalPremium).toFixed(0)}</span>
                          <span>{dte != null ? `${dte}d` : "-"}</span>
                          <span>{fmtDate(cycle.updated_at?.slice(0, 10) ?? cycle.created_at?.slice(0, 10) ?? "1970-01-01")}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadgeStyle(cycle.state)}`}
                          >
                            {tab === "COMPLETED" ? "Completed" : "Active"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedWheelId(cycle.id)}
                            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            View Wheel
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto px-4 py-3">
                        <div className="flex min-w-max items-center gap-2">
                          {sortedLegs.map((trade, index) => (
                            <div key={trade.id} className="flex items-center gap-2">
                              <div
                                className={`w-40 rounded-xl border px-3 py-2 ${
                                  trade.option_type === "PUT"
                                    ? "border-violet-200 bg-violet-50/50"
                                    : "border-emerald-200 bg-emerald-50/50"
                                }`}
                              >
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                                  {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-gray-900">
                                  ${trade.strike.toFixed(2)}
                                </p>
                                <p className="text-[11px] font-medium text-emerald-700">
                                  +${(trade.premium * trade.contracts * 100).toFixed(0)}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-500">{fmtDate(trade.expiry)}</p>
                                <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                                  {trade.status}
                                </span>
                              </div>
                              {index < sortedLegs.length - 1 && (
                                <span className="text-gray-400">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
