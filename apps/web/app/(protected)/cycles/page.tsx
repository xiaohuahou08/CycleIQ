"use client";

import { useEffect, useMemo, useState } from "react";
import { listCycles, listTrades, type CycleSummary, type Trade } from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

function stateBadgeStyle(state: string): string {
  if (state === "IDLE") return "bg-gray-100 text-gray-700";
  if (state === "CSP_OPEN") return "bg-blue-100 text-blue-700";
  if (state === "STOCK_HELD") return "bg-purple-100 text-purple-700";
  if (state === "CC_OPEN") return "bg-amber-100 text-amber-700";
  if (state === "EXIT") return "bg-green-100 text-green-700";
  return "bg-slate-100 text-slate-700";
}

const WHEEL_STEPS = ["IDLE", "CSP_OPEN", "STOCK_HELD", "CC_OPEN", "EXIT"] as const;
const NOW_TS = Date.now();

function wheelProgressIndex(state: string): number {
  const idx = WHEEL_STEPS.indexOf(state as (typeof WHEEL_STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

function CycleWheel({ state }: { state: string }) {
  const activeIndex = wheelProgressIndex(state);
  const size = 54;
  const center = size / 2;
  const radius = 20;

  return (
    <div className="relative h-14 w-14 shrink-0 rounded-full border border-gray-200 bg-white">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        {WHEEL_STEPS.map((step, index) => {
          const angle = (Math.PI * 2 * index) / WHEEL_STEPS.length - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const isActive = index <= activeIndex;
          const isCurrent = step === state;
          return (
            <circle
              key={step}
              cx={x}
              cy={y}
              r={isCurrent ? 4.5 : 3.5}
              fill={isActive ? "#2563eb" : "#d1d5db"}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-gray-500">
        Wheel
      </div>
    </div>
  );
}

export default function CyclesPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCycleIds, setOpenCycleIds] = useState<Record<string, boolean>>({});
  const [viewTab, setViewTab] = useState<"WHEELS" | "CC_COST_BASIS" | "CSP_PREMIUM" | "DTE_TIMELINE">(
    "WHEELS"
  );
  const [tab, setTab] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");
  const [timeRange, setTimeRange] = useState<"ALL" | "WEEK" | "MONTH" | "YEAR">("ALL");
  const [sortBy, setSortBy] = useState<"LATEST" | "PREMIUM" | "TICKER">("LATEST");
  const [searchTicker, setSearchTicker] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
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

  const sortedCycles = useMemo(
    () =>
      cycles
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
            new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        ),
    [cycles]
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
        const aPremium = (tradesByCycle[a.id] ?? []).reduce(
          (sum, t) => sum + t.premium * t.contracts * 100,
          0
        );
        const bPremium = (tradesByCycle[b.id] ?? []).reduce(
          (sum, t) => sum + t.premium * t.contracts * 100,
          0
        );
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

  if (isAuthLoading) return null;

  return (
    <main className="flex-1 bg-gray-100/80 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Visualization</h1>
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
                        (tradesByCycle[cycle.id] ?? []).reduce(
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
                  const linkedTrades = tradesByCycle[cycle.id] ?? [];
                  const totalPremium = linkedTrades.reduce(
                    (sum, trade) => sum + trade.premium * trade.contracts * 100,
                    0
                  );
                  const openCount = linkedTrades.filter((trade) => trade.status === "OPEN").length;
                  const expanded = openCycleIds[cycle.id] ?? false;

                  return (
                    <div
                      key={cycle.id}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCycleIds((prev) => ({ ...prev, [cycle.id]: !expanded }))
                        }
                        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{expanded ? "▼" : "▶"}</span>
                          <CycleWheel state={cycle.state} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold text-gray-900">{cycle.ticker}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadgeStyle(cycle.state)}`}
                              >
                                {cycle.state}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Updated {fmtDateTime(cycle.updated_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 text-xs text-gray-500">
                          <span>{linkedTrades.length} trades</span>
                          <span>{openCount} open</span>
                          <span className="font-medium text-green-700">+${totalPremium.toFixed(0)}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-gray-100 px-5 py-4">
                          {linkedTrades.length === 0 ? (
                            <p className="text-sm text-gray-500">No linked trades in this cycle yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Type</th>
                                    <th className="py-2">Strike</th>
                                    <th className="py-2">Qty</th>
                                    <th className="py-2">Premium</th>
                                    <th className="py-2">Commission</th>
                                    <th className="py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {linkedTrades
                                    .slice()
                                    .sort(
                                      (a, b) =>
                                        new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
                                    )
                                    .map((trade) => (
                                      <tr key={trade.id} className="text-gray-700">
                                        <td className="py-2">{fmtDate(trade.trade_date)}</td>
                                        <td className="py-2">{trade.option_type}</td>
                                        <td className="py-2">${trade.strike.toFixed(2)}</td>
                                        <td className="py-2">{trade.contracts}</td>
                                        <td className="py-2">${trade.premium.toFixed(2)}</td>
                                        <td className="py-2">
                                          {trade.commission_fee != null
                                            ? `$${trade.commission_fee.toFixed(2)}`
                                            : "-"}
                                        </td>
                                        <td className="py-2">{trade.status}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
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
