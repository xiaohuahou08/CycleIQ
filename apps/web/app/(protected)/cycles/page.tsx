"use client";

import { useEffect, useMemo, useState } from "react";
import { listCycles, listTrades, updateTrade, type CycleSummary, type Trade } from "@/lib/api/trades";
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

/** Net cashflow for a single trade leg: gross premium − buyback (for rolls) − commission. */
function netLegCashflow(t: Trade): number {
  const gross = t.premium * t.contracts * 100;
  const buyback = (t.buyback_cost_per_share ?? 0) * t.contracts * 100;
  const commission = t.commission_fee ?? 0;
  return gross - buyback - commission;
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

function deriveWheelState(wheelTrades: Trade[], cycleState: string): string {
  const hasOpen = wheelTrades.some((t) => t.status === "OPEN");
  if (hasOpen) return cycleState.startsWith("CC") ? cycleState : "CSP_OPEN";
  // PUT was assigned → user holds stock, not completed
  const hasAssigned = wheelTrades.some((t) => t.status === "ASSIGNED" && t.option_type === "PUT");
  if (hasAssigned) return "STOCK_HELD";
  // Backend explicitly says stock is held
  if (cycleState === "STOCK_HELD" || cycleState === "CC_OPEN") return cycleState;
  return "EXIT";
}

function splitCycleIntoWheels(cycle: CycleSummary, linkedTrades: Trade[]): WheelSummary[] {
  const sorted = linkedTrades
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  if (sorted.length === 0) {
    return [{ ...cycle, source_cycle_id: cycle.id, trades: [] }];
  }

  // A new wheel starts only at a PUT that is NOT a roll continuation.
  // Rolled legs (rolled_from_id set) belong to the same wheel as their parent.
  const putStartIndexes = sorted
    .map((trade, index) =>
      trade.option_type === "PUT" && !trade.rolled_from_id ? index : -1
    )
    .filter((index) => index >= 0);

  if (putStartIndexes.length <= 1) {
    const derivedState = deriveWheelState(sorted, cycle.state);
    return [{ ...cycle, source_cycle_id: cycle.id, trades: sorted, state: derivedState }];
  }

  return putStartIndexes.map((startIndex, idx) => {
    const endIndex = putStartIndexes[idx + 1] ?? sorted.length;
    const wheelTrades = sorted.slice(startIndex, endIndex);
    const latestTradeDate = wheelTrades[wheelTrades.length - 1]?.trade_date ?? cycle.updated_at;
    const derivedState = deriveWheelState(wheelTrades, cycle.state);
    return {
      ...cycle,
      id: `${cycle.id}:${idx}`,
      state: derivedState,
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
  const [linkingTradeId, setLinkingTradeId] = useState<string | null>(null);
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
    () =>
      cycles
        .flatMap((cycle) => splitCycleIntoWheels(cycle, tradesByCycle[cycle.id] ?? []))
        .filter((w) => w.trades.length > 0),
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
        const aPremium = a.trades.reduce((sum, t) => sum + netLegCashflow(t), 0);
        const bPremium = b.trades.reduce((sum, t) => sum + netLegCashflow(t), 0);
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

        // Net CC cashflow: deduct buyback for rolled legs so the basis-reduction number
        // reflects what was actually kept, not just the gross premiums collected.
        const ccPremiumTotal = tickerTrades
          .filter((t) => t.option_type === "CALL")
          .reduce((sum, t) => sum + netLegCashflow(t), 0);

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

  // CC trades for the same ticker that are not already part of this wheel — candidates to link in.
  const orphanedCCs = useMemo(() => {
    if (!selectedWheel) return [];
    const wheelTradeIds = new Set(selectedWheelLegs.map((t) => t.id));
    return trades.filter(
      (t) =>
        t.option_type === "CALL" &&
        t.ticker === selectedWheel.ticker &&
        !wheelTradeIds.has(t.id) &&
        t.cycle_id !== selectedWheel.source_cycle_id
    );
  }, [selectedWheel, selectedWheelLegs, trades]);

  const handleLinkTrade = async (tradeId: string) => {
    if (!token || !selectedWheel) return;
    setLinkingTradeId(tradeId);
    try {
      await updateTrade(token, tradeId, { cycle_id: selectedWheel.source_cycle_id });
      // Refresh both cycles and trades
      const [cycleRows, tradeRows] = await Promise.all([listCycles(token), listTrades(token)]);
      setCycles(cycleRows);
      setTrades(tradeRows);
    } finally {
      setLinkingTradeId(null);
    }
  };

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
                <p className="text-xs text-gray-500">Net Premium</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  $
                  {sortedCycles
                    .reduce(
                      (sum, cycle) =>
                        sum + cycle.trades.reduce((tradeSum, t) => tradeSum + netLegCashflow(t), 0),
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
          <>
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
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateBadgeStyle(selectedWheel.state)}`}
                >
                  {selectedWheel.state === "EXIT" ? "Completed" : "Active"}
                </span>
              </div>
            </div>
            {(() => {
              const legs = selectedWheelLegs;
              const count = legs.length;
              const cardW = 168;
              const W = 720;
              const H = 460;
              const cx = W / 2;
              const cy = H * 0.65;
              const arcR = count <= 1 ? 0 : Math.min(210, 140 + (count - 1) * 20);
              const fanDeg = count <= 1 ? 0 : Math.min(160, 50 + (count - 1) * 38);
              const startDeg = -90 - fanDeg / 2;
              const totalNet = legs.reduce((s, t) => s + netLegCashflow(t), 0);

              const positions = legs.map((_, i) => {
                const angleDeg = count === 1 ? -90 : startDeg + (i / (count - 1)) * fanDeg;
                const rad = (angleDeg * Math.PI) / 180;
                return { x: cx + arcR * Math.cos(rad), y: cy + arcR * Math.sin(rad) };
              });

              return (
                <div className="overflow-x-auto bg-[#fcfdfd]">
                  <div className="relative mx-auto" style={{ width: W, height: H }}>
                    <svg
                      className="pointer-events-none absolute inset-0"
                      width={W} height={H}
                    >
                      {/* Guide ring */}
                      {arcR > 0 && (
                        <circle cx={cx} cy={cy} r={arcR + 22}
                          fill="none" stroke="#e9eeef" strokeDasharray="4 6" strokeWidth="1" />
                      )}
                      {/* Spokes: card → center */}
                      {positions.map((pos, i) => (
                        <line key={`sp-${i}`}
                          x1={pos.x} y1={pos.y} x2={cx} y2={cy}
                          stroke="#dde3e6" strokeDasharray="4 5" strokeWidth="1" strokeLinecap="round" />
                      ))}
                      {/* Arrow + PnL pill between consecutive legs */}
                      {positions.slice(0, -1).map((posA, i) => {
                        const posB = positions[i + 1]!;
                        const dx = posB.x - posA.x;
                        const dy = posB.y - posA.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const pad = cardW / 2 + 12;
                        const x1 = posA.x + (dx / len) * pad;
                        const y1 = posA.y + (dy / len) * pad;
                        const x2 = posB.x - (dx / len) * pad;
                        const y2 = posB.y - (dy / len) * pad;
                        // Perpendicular offset (always points upward / away from center)
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        // Perp direction pointing away from center circle
                        const perpX = -(dy / len);
                        const perpY = dx / len;
                        const sign = (mx - cx) * perpX + (my - cy) * perpY < 0 ? -1 : 1;
                        const labelX = mx + sign * perpX * 26;
                        const labelY = my + sign * perpY * 26;
                        const net = netLegCashflow(legs[i]!);
                        const isDebit = net < 0;
                        const color = isDebit ? "#dc2626" : "#059669";
                        const pillBg = isDebit ? "#fef2f2" : "#f0fdf4";
                        const pillStroke = isDebit ? "#fca5a5" : "#6ee7b7";
                        const labelStr = `${isDebit ? "−" : "+"}$${Math.abs(net).toFixed(0)}`;
                        const pillW = Math.max(52, labelStr.length * 7 + 16);
                        return (
                          <g key={`arr-${i}`}>
                            <defs>
                              <marker id={`mh-${i}`} viewBox="0 0 10 10" refX="8" refY="5"
                                markerWidth="5" markerHeight="5" orient="auto">
                                <path d="M0,1.5 L8.5,5 L0,8.5 Z" fill={color} />
                              </marker>
                            </defs>
                            <line x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke={color} strokeWidth="1.8" markerEnd={`url(#mh-${i})`} />
                            <rect x={labelX - pillW / 2} y={labelY - 10}
                              width={pillW} height={20} rx={10}
                              fill={pillBg} stroke={pillStroke} strokeWidth="1" />
                            <text x={labelX} y={labelY + 4.5}
                              textAnchor="middle" fontSize="10.5" fontWeight="700" fill={color}>
                              {labelStr}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Center circle */}
                    <div className="absolute flex flex-col items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-50 shadow-md"
                      style={{ width: 104, height: 104, left: cx, top: cy, transform: "translate(-50%,-50%)" }}>
                      <TickerLogo ticker={selectedWheel.ticker} size="sm" />
                      <div className="mt-0.5 text-[12px] font-bold text-gray-900">{selectedWheel.ticker}</div>
                      <div className={`text-[11px] font-semibold ${totalNet < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {totalNet < 0 ? "−" : "+"}${Math.abs(totalNet).toFixed(0)}
                      </div>
                    </div>

                    {/* Leg cards */}
                    {legs.map((trade, idx) => {
                      const pos = positions[idx]!;
                      const net = netLegCashflow(trade);
                      const isDebit = net < 0;
                      return (
                        <div key={trade.id} className="absolute"
                          style={{ width: cardW, left: pos.x, top: pos.y, transform: "translate(-50%,-50%)" }}>
                          {/* Step badge */}
                          <div className="absolute -left-3 -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-700 text-[11px] font-bold text-white shadow">
                            {idx + 1}
                          </div>
                          <div className={`rounded-xl border-2 bg-white px-3 py-2.5 shadow-sm ${
                            trade.option_type === "PUT" ? "border-[#c7b8ef]" : "border-[#9fd8ca]"}`}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                              {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
                            </p>
                            <p className="mt-0.5 text-[28px] font-bold leading-none text-gray-900">
                              ${trade.strike.toFixed(0)}
                            </p>
                            <p className={`text-[12px] font-semibold ${isDebit ? "text-red-600" : "text-emerald-700"}`}>
                              {isDebit ? "−" : "+"}${Math.abs(net).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-gray-500">{fmtDate(trade.expiry)}</p>
                            <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              {trade.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          {orphanedCCs.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Unlinked CC trades for {selectedWheel.ticker} — link to this wheel?
              </p>
              <div className="flex flex-col gap-2">
                {orphanedCCs.map((t) => {
                  const net = netLegCashflow(t);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3 text-[13px]">
                        <span className="font-semibold text-gray-900">${t.strike.toFixed(0)} CC</span>
                        <span className="text-gray-500">{fmtDate(t.expiry)}</span>
                        <span className={`font-medium ${net < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {net < 0 ? "-" : "+"}${Math.abs(net).toFixed(2)}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {t.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={linkingTradeId === t.id}
                        onClick={() => void handleLinkTrade(t.id)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {linkingTradeId === t.id ? "Linking…" : "Link to this wheel"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
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
