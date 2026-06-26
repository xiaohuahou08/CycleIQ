"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Search } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { listCycles, listTrades, type CycleSummary, type Trade } from "@/lib/api/trades";
import {
  buildCcCostBasisRows,
  isCompletedWheel,
  netLegCashflow,
  wheelTotalNetPnl,
} from "@/lib/cycles/ccCostBasis";
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

function fmtStatusLabel(status: string): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stateBadgeStyle(state: string): string {
  if (state === "IDLE") return "bg-slate-200/70 text-slate-800 ring-slate-200";
  if (state === "CSP_OPEN") return "bg-blue-50 text-blue-800 ring-blue-100";
  if (state === "STOCK_HELD") return "bg-purple-50 text-purple-800 ring-purple-100";
  if (state === "CC_OPEN") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (state === "EXIT") return "bg-amber-50 text-amber-900 ring-amber-200 font-semibold";
  if (state === "CSP_CLOSED") return "bg-slate-200/70 text-slate-800 ring-slate-200 font-semibold";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

const SEARCH_INPUT_CLS =
  "h-9 w-full rounded-lg border border-slate-300 bg-white py-0 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

const PILL_ACTIVE = "bg-slate-900 text-white shadow-sm";
const PILL_IDLE =
  "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:text-slate-950";

const STAT_LABEL = "text-xs font-medium text-slate-600";
const STAT_VALUE = "mt-1 text-2xl font-semibold tabular-nums text-slate-900";

const NOW_TS = Date.now();

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(ticker)}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function TickerLogo({ ticker, size = "sm" }: { ticker: string; size?: "sm" | "lg" }) {
  const [urlIndex, setUrlIndex] = useState(0);
  const dim = size === "lg" ? "h-10 w-10 rounded-lg" : "h-[26px] w-[26px] rounded-md";
  const fallbackDim =
    size === "lg" ? "h-10 w-10 rounded-lg text-sm" : "h-[26px] w-[26px] rounded-md text-[11px]";

  if (urlIndex >= LOGO_URL_BUILDERS.length) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-slate-200/80 ${fallbackDim}`}
      >
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={LOGO_URL_BUILDERS[urlIndex](ticker)}
      alt=""
      className={`object-cover ring-1 ring-slate-200/80 ${dim}`}
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

function MoneyIcon() {
  return (
    <CircleDollarSign
      className={`${iconSm} text-slate-500`}
      strokeWidth={iconStroke}
      aria-hidden
    />
  );
}

interface CycleWheelSummary extends CycleSummary {
  source_cycle_id: string;
  trades: Trade[];
}

function deriveWheelState(wheelTrades: Trade[], cycleState: string): string {
  const hasOpen = wheelTrades.some((t) => t.status === "OPEN");
  if (hasOpen) return cycleState.startsWith("CC") ? cycleState : "CSP_OPEN";

  const hasCalledAwayCall = wheelTrades.some(
    (t) => t.option_type === "CALL" && t.status === "CALLED_AWAY"
  );
  // A called-away covered call means the wheel fully exits this cycle.
  if (hasCalledAwayCall) return "EXIT";

  // PUT was assigned → user holds stock, not completed
  const hasAssigned = wheelTrades.some((t) => t.status === "ASSIGNED" && t.option_type === "PUT");
  if (hasAssigned) return "STOCK_HELD";

  const hasPut = wheelTrades.some((t) => t.option_type === "PUT");
  const hasCall = wheelTrades.some((t) => t.option_type === "CALL");
  // 只有CSP分支（如 buy-to-close / close）结束，归到 CSP_CLOSED。
  if (hasPut && !hasCall) return "CSP_CLOSED";

  // Backend explicitly says stock is held
  if (cycleState === "STOCK_HELD" || cycleState === "CC_OPEN") return cycleState;
  return "EXIT";
}

function splitCycleIntoWheels(cycle: CycleSummary, linkedTrades: Trade[]): CycleWheelSummary[] {
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
  const [viewTab, setViewTab] = useState<"WHEELS" | "CC_COST_BASIS">("WHEELS");
  const [tab, setTab] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");
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
    () => sortedCycles.filter((cycle) => cycle.state !== "EXIT" && cycle.state !== "CSP_CLOSED"),
    [sortedCycles]
  );
  const completedCycles = useMemo(
    () => sortedCycles.filter((cycle) => cycle.state === "EXIT" || cycle.state === "CSP_CLOSED"),
    [sortedCycles]
  );
  const tabCycles =
    tab === "ACTIVE" ? activeCycles : tab === "COMPLETED" ? completedCycles : sortedCycles;
  const visibleCycles = useMemo(() => {
    const searched = tabCycles.filter((cycle) =>
      cycle.ticker.toLowerCase().includes(searchTicker.trim().toLowerCase())
    );

    return searched.slice().sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
        new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    );
  }, [searchTicker, tabCycles]);

  const ccCostBasisRows = useMemo(() => {
    return buildCcCostBasisRows(wheels, trades)
      .filter((row) =>
        row.ticker.toLowerCase().includes(searchTicker.trim().toLowerCase())
      )
      .sort((a, b) => b.reductionPct - a.reductionPct);
  }, [searchTicker, trades, wheels]);

  const ccHeadline = useMemo(() => {
    const positionsTracked = ccCostBasisRows.length;
    const totalCcPremium = ccCostBasisRows.reduce((sum, row) => sum + row.ccPremiumTotal, 0);
    const avgReduction =
      positionsTracked > 0
        ? ccCostBasisRows.reduce((sum, row) => sum + row.reductionPct, 0) / positionsTracked
        : 0;
    return { positionsTracked, totalCcPremium, avgReduction };
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
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/40">
      <div className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5">
              {(
                [
                  ["WHEELS", "Wheels"],
                  ["CC_COST_BASIS", "CC Cost Basis"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewTab(key)}
                  className={`inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-semibold uppercase tracking-wide transition ${
                    viewTab === key ? PILL_ACTIVE : PILL_IDLE
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {viewTab === "CC_COST_BASIS" && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <p className={STAT_LABEL}>Open Positions</p>
                <p className={STAT_VALUE}>{ccHeadline.positionsTracked}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <p className={STAT_LABEL}>Total CC Premium</p>
                <p className={STAT_VALUE}>
                  ${ccHeadline.totalCcPremium.toFixed(0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <p className={STAT_LABEL}>Avg Reduction</p>
                <p className={STAT_VALUE}>{ccHeadline.avgReduction.toFixed(1)}%</p>
              </div>
            </div>
          )}

        {loading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 ring-1 ring-slate-100" />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-base font-semibold text-slate-900">No cycles yet</p>
            <p className="max-w-sm text-sm text-slate-600">
              Create trades to auto-link cycles.
            </p>
          </div>
        ) : viewTab === "CC_COST_BASIS" ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[8.5rem] max-w-[14rem] flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Search className={iconSm} strokeWidth={iconStroke} aria-hidden />
                </span>
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  placeholder="Search ticker…"
                  className={SEARCH_INPUT_CLS}
                />
              </div>
            </div>
            {ccCostBasisRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-14 text-center">
                <p className="text-base font-semibold text-slate-900">No open stock positions</p>
                <p className="max-w-md text-sm text-slate-600">
                  Assigned CSP holdings appear here. Wheels that exited (called away or closed) are
                  not shown.
                </p>
              </div>
            ) : (
              ccCostBasisRows.map((row) => (
                <div key={row.wheelId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <TickerLogo ticker={row.ticker} />
                      <div>
                        <span className="text-base font-semibold text-slate-900">{row.ticker}</span>
                        <p className="text-sm text-slate-600">{row.subtitle}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                      {row.reductionPct.toFixed(1)}% reduced
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">Initial Cost</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">${row.initialCost.toFixed(2)}</p>
                      <p className="text-xs text-slate-600">per share</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-700">Current Cost</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">${row.currentCost.toFixed(2)}</p>
                      <p className="text-xs text-emerald-700">per share</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">CC Premium (Realized)</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">${row.ccPremiumTotal.toFixed(0)}</p>
                      <p className="text-xs text-slate-600">total</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">CC Positions</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{row.ccPositions}</p>
                      <p className="text-xs text-slate-600">{row.assignedShares} shares</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-600">
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
                    <div className="mt-2 flex items-center justify-center gap-20 text-xs text-slate-600">
                      <span>Purchase</span>
                      <span>{fmtDate(new Date(row.recentTradeDate).toISOString().slice(0, 10))}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : selectedWheel ? (
          <>
          <div
            className={`mt-5 overflow-hidden rounded-xl border shadow-sm ${
              isCompletedWheel(selectedWheel.state)
                ? "border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white ring-1 ring-amber-200/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`flex h-[58px] items-center justify-between border-b px-5 ${
                isCompletedWheel(selectedWheel.state)
                  ? "border-amber-200 bg-amber-50/90"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedWheelId(null)}
                  className="rounded-full p-1 text-slate-600 hover:bg-white hover:text-slate-900"
                  title="Back"
                >
                  ←
                </button>
                <TickerLogo ticker={selectedWheel.ticker} size="lg" />
                <div>
                  <p className="text-xl font-semibold leading-none text-slate-900">
                    {selectedWheel.ticker} Wheel
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-600">
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
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stateBadgeStyle(selectedWheel.state)}`}
                >
                  {isCompletedWheel(selectedWheel.state) ? "Completed" : "Active"}
                </span>
              </div>
            </div>
            {(() => {
              const legs = selectedWheelLegs;
              const completed = isCompletedWheel(selectedWheel.state);
              const count = legs.length;
              const cardW = 168;
              const cardH = 152; // measured card height (generous)
              const cardGap = 36; // minimum gap between card edges

              // Fan angle fixed per leg count
              const fanDeg =
                count <= 1 ? 0
                : count === 2 ? 110
                : count === 3 ? 150
                : Math.min(180, 110 + (count - 2) * 20);

              const angularStep = count <= 1 ? 0 : fanDeg / (count - 1);
              const stepRad = (angularStep * Math.PI) / 180;

              // For an arc centred at -90° (top), the adjacent pair nearest the top has:
              //   horizontal separation ≈ arcR × sin(step)
              //   vertical separation   ≈ arcR × (1 − cos(step))
              // Both must exceed (cardDim + gap) to avoid rectangular overlap.
              const horzDiff = count <= 1 ? 1 : Math.sin(stepRad);
              const vertDiff = count <= 1 ? 1 : Math.max(0.001, 1 - Math.cos(stepRad));
              const arcRForHorz = (cardW + cardGap) / horzDiff;
              const arcRForVert = (cardH + cardGap) / vertDiff;
              const arcR = count <= 1 ? 190 : Math.max(220, Math.ceil(Math.max(arcRForHorz, arcRForVert)));

              const W = Math.max(720, Math.ceil((arcR + cardW / 2 + 56) * 2));
              const cx = W / 2;
              const cy = arcR + cardH / 2 + 64; // top card 64 px from top
              const H = Math.ceil(cy + 230);    // room for centre circle + label

              const startDeg = -90 - fanDeg / 2;
              const totalNet = wheelTotalNetPnl(legs);

              const positions = legs.map((_, i) => {
                const angleDeg = count <= 1 ? -90 : startDeg + (i / (count - 1)) * fanDeg;
                const rad = (angleDeg * Math.PI) / 180;
                return { x: cx + arcR * Math.cos(rad), y: cy + arcR * Math.sin(rad) };
              });

              // Pre-compute arrow geometry
              const arrows = positions.slice(0, -1).map((posA, i) => {
                const posB = positions[i + 1]!;
                const dx = posB.x - posA.x;
                const dy = posB.y - posA.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const pad = cardW / 2 + 14;
                const x1 = posA.x + (dx / len) * pad;
                const y1 = posA.y + (dy / len) * pad;
                const x2 = posB.x - (dx / len) * pad;
                const y2 = posB.y - (dy / len) * pad;
                const color = "#6b7280"; // neutral gray arrow
                return { x1, y1, x2, y2, color, i };
              });

              const centerSize = completed ? 120 : 104;
              const ringStroke = completed ? "#f59e0b" : "#e9eeef";
              const spokeStroke = completed ? "#fcd34d" : "#dde3e6";

              return (
                <div
                  className={`overflow-x-auto ${completed ? "bg-gradient-to-b from-amber-50/40 to-[#fcfdfd]" : "bg-[#fcfdfd]"}`}
                >
                  <div className="relative mx-auto" style={{ width: W, height: H }}>

                    {/* LAYER 1 (behind cards): guide ring + spokes */}
                    <svg className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }} width={W} height={H}>
                      {arcR > 0 && (
                        <circle cx={cx} cy={cy} r={arcR + 22}
                          fill="none" stroke={ringStroke} strokeDasharray={completed ? "6 4" : "4 6"} strokeWidth={completed ? 2 : 1} />
                      )}
                      {positions.map((pos, i) => (
                        <line key={`sp-${i}`}
                          x1={pos.x} y1={pos.y} x2={cx} y2={cy}
                          stroke={spokeStroke} strokeDasharray="4 5" strokeWidth={completed ? 1.5 : 1} strokeLinecap="round" />
                      ))}
                    </svg>

                    {/* Center circle — z-index 1 */}
                    <div
                      className={`absolute flex flex-col items-center justify-center rounded-full border-2 shadow-lg ${
                        completed
                          ? "border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-white ring-4 ring-amber-300/70 shadow-amber-300/40"
                          : "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200/80 shadow-md"
                      }`}
                      style={{
                        zIndex: 1,
                        width: centerSize,
                        height: centerSize,
                        left: cx,
                        top: cy,
                        transform: "translate(-50%,-50%)",
                      }}
                    >
                      {completed && (
                        <span className="absolute -top-1 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                          Done
                        </span>
                      )}
                      <TickerLogo ticker={selectedWheel.ticker} size="sm" />
                      <div className={`font-bold text-slate-900 ${completed ? "mt-1 text-sm" : "mt-0.5 text-xs"}`}>
                        {selectedWheel.ticker}
                      </div>
                      <div
                        className={`font-bold tabular-nums ${
                          completed ? "text-[14px]" : "text-[11px] font-semibold"
                        } ${totalNet < 0 ? "text-red-700" : completed ? "text-amber-900" : "text-emerald-700"}`}
                      >
                        {totalNet < 0 ? "−" : "+"}${Math.abs(totalNet).toFixed(0)}
                      </div>
                      {completed && (
                        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700/90">
                          Net P&L
                        </span>
                      )}
                    </div>

                    {/* Leg cards — z-index 2 */}
                    {legs.map((trade, idx) => {
                      const pos = positions[idx]!;
                      const net = netLegCashflow(trade);
                      const isDebit = net < 0;
                      return (
                        <div key={trade.id} className="absolute"
                          style={{ zIndex: 2, width: cardW, left: pos.x, top: pos.y, transform: "translate(-50%,-50%)" }}>
                          <div className={`rounded-xl border-2 bg-white px-3 py-2.5 shadow-sm ${
                            trade.option_type === "PUT" ? "border-[#c7b8ef]" : "border-[#9fd8ca]"}`}>
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
                              </p>
                            </div>
                            <p className="text-[28px] font-bold leading-none tabular-nums text-slate-900">
                              ${trade.strike.toFixed(0)}
                            </p>
                            <p className={`text-sm font-semibold tabular-nums ${isDebit ? "text-red-600" : "text-emerald-700"}`}>
                              {isDebit ? "−" : "+"}${Math.abs(net).toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-600">{fmtDate(trade.expiry)}</p>
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80">
                              {fmtStatusLabel(trade.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* LAYER 2 (above cards): arrows — z-index 3 */}
                    <svg className="pointer-events-none absolute inset-0" style={{ zIndex: 3 }} width={W} height={H}>
                      <defs>
                        {arrows.map(({ color, i }) => (
                          <marker key={`m-${i}`} id={`mh-${i}`} viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M0,1.5 L8.5,5 L0,8.5 Z" fill={color} />
                          </marker>
                        ))}
                      </defs>
                      {arrows.map(({ x1, y1, x2, y2, color, i }) => (
                        <line key={`arr-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke={color} strokeWidth="2" markerEnd={`url(#mh-${i})`} />
                      ))}
                    </svg>

                  </div>
                </div>
              );
            })()}
          </div>
          </>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[8.5rem] max-w-[14rem] flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Search className={iconSm} strokeWidth={iconStroke} aria-hidden />
                </span>
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  placeholder="Search ticker…"
                  className={SEARCH_INPUT_CLS}
                />
              </div>
              <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-200/50 p-1">
                {(["ALL", "ACTIVE", "COMPLETED"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition ${
                      tab === item
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-300/80"
                        : "text-slate-700 hover:text-slate-950"
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

            <div className="mt-4 space-y-4">
              {visibleCycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-14 text-center">
                  <p className="text-base font-semibold text-slate-900">No cycles in this tab</p>
                  <p className="text-sm text-slate-600">Try another tab or search term.</p>
                </div>
              ) : (
                visibleCycles.map((cycle) => {
                  const linkedTrades = cycle.trades;
                  const openCount = linkedTrades.filter((trade) => trade.status === "OPEN").length;
                  const sortedLegs = linkedTrades
                    .slice()
                    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

                  const cycleCompleted = isCompletedWheel(cycle.state);
                  return (
                    <div
                      key={cycle.id}
                      className={`overflow-hidden rounded-xl border shadow-sm ${
                        cycleCompleted
                          ? "border-amber-300 bg-gradient-to-r from-amber-50/90 to-white ring-1 ring-amber-200/60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between border-b px-5 py-3.5 ${
                          cycleCompleted ? "border-amber-200/80 bg-amber-50/50" : "border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <TickerLogo ticker={cycle.ticker} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold text-slate-900">{cycle.ticker}</span>
                              <span className="text-sm text-slate-600">
                                {linkedTrades.length} legs · {openCount} open
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="tabular-nums">{fmtDate(cycle.updated_at?.slice(0, 10) ?? cycle.created_at?.slice(0, 10) ?? "1970-01-01")}</span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stateBadgeStyle(cycle.state)}`}
                          >
                            {tab === "COMPLETED" ? "Completed" : "Active"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedWheelId(cycle.id)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                          >
                            View Wheel
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto px-5 py-4">
                        <div className="flex min-w-max items-center gap-2">
                          {sortedLegs.map((trade, index) => (
                            <div key={trade.id} className="flex items-center gap-2">
                              <div
                                className={`w-44 rounded-xl border px-3 py-2.5 ${
                                  trade.option_type === "PUT"
                                    ? "border-violet-200 bg-violet-50/50"
                                    : "border-emerald-200 bg-emerald-50/50"
                                }`}
                              >
                                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">
                                  {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
                                </p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                                  ${trade.strike.toFixed(2)}
                                </p>
                                <p className="text-sm font-semibold tabular-nums text-emerald-700">
                                  +${(trade.premium * trade.contracts * 100).toFixed(0)}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">{fmtDate(trade.expiry)}</p>
                                <span className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80">
                                  {fmtStatusLabel(trade.status)}
                                </span>
                              </div>
                              {index < sortedLegs.length - 1 && (
                                <span className="text-slate-400">→</span>
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
      </div>
    </main>
  );
}
