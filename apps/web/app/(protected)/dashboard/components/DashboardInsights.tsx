"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { CARD_BASE, KPI_ACCENT, profitLossClass } from "@/app/components/ui/styles";
import { Card } from "@/components/ui/card";
import type {
  CapitalTrendCharts,
  DashboardInsights as DashboardInsightsData,
  DashboardSeriesPoint,
} from "@/lib/api/trades";

type TrendGranularity = "week" | "month";
type TrendRange = "ytd" | "1y";

const TOOLTIP_MAX_W = 224;
const TOOLTIP_GAP = 8;
const VIEWPORT_PAD = 12;

function StatCardHelp({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: TOOLTIP_MAX_W });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    const tipEl = tipRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const tipW = Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEWPORT_PAD * 2);
    const tipH = tipEl?.offsetHeight ?? 80;

    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - tipW - VIEWPORT_PAD));

    const spaceBelow = window.innerHeight - rect.bottom - TOOLTIP_GAP - VIEWPORT_PAD;
    const spaceAbove = rect.top - TOOLTIP_GAP - VIEWPORT_PAD;
    let top =
      spaceBelow >= tipH || spaceBelow >= spaceAbove
        ? rect.bottom + TOOLTIP_GAP
        : rect.top - TOOLTIP_GAP - tipH;

    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - tipH - VIEWPORT_PAD));
    setCoords({ top, left, width: tipW });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(updatePosition);
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition, tip]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors duration-150 hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        aria-label="Metric details"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info className={iconSm} strokeWidth={iconStroke} aria-hidden />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[9999] rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 text-[11px] leading-snug text-slate-100 shadow-xl"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {tip}
          </div>,
          document.body
        )}
    </>
  );
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function BarChartCard({
  title,
  points,
  gradient,
}: {
  title: string;
  points: { label: string; value: number }[];
  gradient: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const recentPoints = points.slice(-6);
  return (
    <div className={`${CARD_BASE} p-5`}>
      <p className="mb-4 text-sm font-semibold text-slate-800">{title}</p>
      <div className="flex h-40 items-end gap-2">
        {points.length === 0 ? (
          <p className="text-sm text-slate-400">No data</p>
        ) : (
          points.map((p, i) => {
            const height = Math.max(16, Math.round((p.value / max) * 128));
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-600">{fmtCurrency(p.value)}</span>
                <div
                  className={`animate-bar-grow w-full rounded-md transition-[filter] duration-150 hover:brightness-110 ${gradient}`}
                  style={{ height: `${height}px`, animationDelay: `${i * 60}ms` }}
                  title={`${p.label}: ${fmtCurrency(p.value)}`}
                />
                <span className="truncate text-[10px] text-slate-400">{p.label}</span>
              </div>
            );
          })
        )}
      </div>
      {recentPoints.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="space-y-1">
            {recentPoints.map((p) => (
              <div
                key={`${title}-${p.label}`}
                className="flex items-center justify-between rounded px-1.5 py-0.5 text-xs"
              >
                <span className="truncate text-slate-500">{p.label}</span>
                <span className="font-semibold text-slate-700">{fmtCurrency(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function chartYDomain(values: number[], budgetLine?: number): { min: number; max: number } {
  const all = [...values, ...(budgetLine != null && budgetLine > 0 ? [budgetLine] : [])];
  if (all.length === 0) return { min: 0, max: 1 };

  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const magnitude = Math.max(rawMax, 1);
  // Ensure small P&L moves are visible on a large capital base (e.g. $100k + $450).
  const minHalfSpan = magnitude * 0.025;
  const halfSpan = Math.max((rawMax - rawMin) / 2, minHalfSpan);
  const center = (rawMin + rawMax) / 2;

  return {
    min: Math.max(0, center - halfSpan * 1.12),
    max: center + halfSpan * 1.12,
  };
}

function yAxisTicks(min: number, max: number, count = 4): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function formatTrendPeriod(
  point: DashboardSeriesPoint,
  granularity: TrendGranularity
): string {
  if (point.date) {
    const [y, m, d] = point.date.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (granularity === "month") {
      return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(dt);
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dt);
  }
  return point.label;
}

function formatTrendAxisLabel(
  point: DashboardSeriesPoint,
  granularity: TrendGranularity
): string {
  if (point.date) {
    const [y, m, d] = point.date.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (granularity === "month") {
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(dt);
    }
    return new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(dt);
  }
  return point.label;
}

function parseTrendPointDate(point: DashboardSeriesPoint): Date | null {
  if (point.date) {
    const [y, m, d] = point.date.split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      return new Date(y, m - 1, d ?? 1);
    }
  }
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(point.label);
  if (monthMatch) {
    return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
  }
  return null;
}

function filterTrendRange(points: DashboardSeriesPoint[], range: TrendRange): DashboardSeriesPoint[] {
  if (points.length === 0) return [];

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  if (range === "ytd") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 364);
    start.setHours(0, 0, 0, 0);
  }

  return points.filter((p) => {
    const asOf = parseTrendPointDate(p);
    if (!asOf) return true;
    return asOf >= start && asOf <= end;
  });
}

function normalizeCapitalTrend(
  charts: DashboardInsightsData["charts"] | undefined
): CapitalTrendCharts | undefined {
  if (!charts) return undefined;

  if (charts.capital_trend?.weekly?.length || charts.capital_trend?.monthly?.length) {
    return charts.capital_trend;
  }

  const legacy = (charts as { monthly_capital_invested?: DashboardSeriesPoint[] })
    .monthly_capital_invested;
  if (!legacy?.length) {
    return charts.capital_trend;
  }

  return {
    weekly: [],
    monthly: legacy.map((p) => ({
      ...p,
      date: p.date ?? (/^\d{4}-\d{2}$/.test(p.label) ? `${p.label}-01` : p.date),
    })),
  };
}

function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.id
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function sparseLabelIndices(count: number, maxLabels = 8): number[] {
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: maxLabels }, (_, i) => Math.round((i * (count - 1)) / (maxLabels - 1)));
}

function CapitalTrendChart({
  trend,
  budgetLine,
  overBudget,
}: {
  trend: CapitalTrendCharts | undefined;
  budgetLine?: number;
  overBudget: boolean;
}) {
  const [granularity, setGranularity] = useState<TrendGranularity>("month");
  const [range, setRange] = useState<TrendRange>("ytd");

  const points = useMemo(() => {
    const raw = granularity === "week" ? trend?.weekly : trend?.monthly;
    const base = raw ?? [];
    const filtered = filterTrendRange(base, range);
    return filtered.length > 0 ? filtered : base;
  }, [granularity, range, trend]);

  const rangeHint =
    range === "ytd"
      ? "Year to date, snapshot at each week/month end."
      : "Trailing 12 months, snapshot at each week/month end.";

  return (
    <div className={`${CARD_BASE} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">Total Capital Trend</p>
          <StatCardHelp
            tip={`Budget (adjusted for deposits/withdrawals) + cumulative realized P&L at each period end. ${
              budgetLine != null && budgetLine > 0
                ? `Dashed line = current budget (${fmtCurrency(budgetLine)}).`
                : "No budget reference line when deposit/withdrawal history exists."
            } ${rangeHint}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentToggle
            value={granularity}
            options={[
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
            ]}
            onChange={setGranularity}
          />
          <SegmentToggle
            value={range}
            options={[
              { id: "ytd", label: "YTD" },
              { id: "1y", label: "1Y" },
            ]}
            onChange={setRange}
          />
        </div>
      </div>
      <LineChartCard
        points={points}
        stroke={overBudget ? "#dc2626" : "#059669"}
        fill={overBudget ? "#f97316" : "#14b8a6"}
        budgetLine={budgetLine}
        granularity={granularity}
        embedded
      />
    </div>
  );
}

function LineChartCard({
  title,
  points,
  stroke,
  fill,
  budgetLine,
  granularity = "month",
  embedded = false,
}: {
  title?: string;
  points: DashboardSeriesPoint[];
  stroke: string;
  fill: string;
  budgetLine?: number;
  granularity?: TrendGranularity;
  embedded?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const linePathRef = useRef<SVGPathElement>(null);
  const [lineLength, setLineLength] = useState(1000);

  useLayoutEffect(() => {
    if (linePathRef.current) {
      setLineLength(linePathRef.current.getTotalLength());
    }
  }, [points]);

  const width = 640;
  const height = embedded ? 220 : 168;
  const padLeft = 52;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = points.map((p) => p.value);
  const { min, max } = chartYDomain(values, budgetLine);
  const range = max - min || 1;
  const yTicks = yAxisTicks(min, max);

  const toY = (value: number) => padTop + plotH - ((value - min) / range) * plotH;
  const toX = (i: number) =>
    padLeft + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);

  const coords = points.map((p, i) => ({
    ...p,
    x: toX(i),
    y: toY(p.value),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  const budgetY =
    budgetLine != null && budgetLine > 0 ? toY(budgetLine) : null;
  const labelIndices = sparseLabelIndices(points.length);
  const hovered = hoveredIndex != null ? points[hoveredIndex] : null;
  const hoveredCoord = hoveredIndex != null ? coords[hoveredIndex] : null;

  const chartBody = (
    <>
      {points.length === 0 ? (
        <p className="text-sm text-slate-400">No data</p>
      ) : (
        <div className="relative w-full">
          {hovered && hoveredCoord && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 text-center shadow-xl"
              style={{
                left: `${(hoveredCoord.x / width) * 100}%`,
                top: `${(hoveredCoord.y / height) * 100}%`,
                marginTop: -10,
              }}
            >
              <p className="text-[11px] font-medium text-slate-300">
                {formatTrendPeriod(hovered, granularity)}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
                {fmtCurrency(hovered.value)}
              </p>
              {budgetLine != null && budgetLine > 0 && (
                <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                  {hovered.value >= budgetLine ? "+" : ""}
                  {fmtCurrency(hovered.value - budgetLine)} vs budget
                </p>
              )}
            </div>
          )}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={embedded ? "h-56 w-full" : "h-44 w-full"}
            role="img"
            aria-label={title ?? "Total capital trend"}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
                <stop offset="100%" stopColor={fill} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {yTicks.map((tick) => {
              const y = toY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400"
                    fontSize="9"
                  >
                    {fmtCurrency(tick)}
                  </text>
                </g>
              );
            })}
            {budgetY != null && (
              <line
                x1={padLeft}
                y1={budgetY}
                x2={width - padRight}
                y2={budgetY}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            )}
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              ref={linePathRef}
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={lineLength}
              style={{ "--line-length": lineLength } as React.CSSProperties}
              className="animate-line-draw"
            />
            {coords.map((c, i) => (
              <g key={`${c.label}-${i}`}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="#fff"
                  stroke={stroke}
                  strokeWidth="2"
                  className="transition-[r] duration-150"
                />
              </g>
            ))}
            {labelIndices.map((i) => {
              const p = points[i];
              if (!p) return null;
              const x = toX(i);
              return (
                <text
                  key={`x-${p.label}-${i}`}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize="9"
                >
                  {formatTrendAxisLabel(p, granularity)}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </>
  );

  if (embedded) return chartBody;

  return (
    <div className={`${CARD_BASE} p-5`}>
      {title && <p className="mb-4 text-sm font-semibold text-slate-800">{title}</p>}
      {chartBody}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  tip,
  valueClassName,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  tip?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="card-hover-lift relative overflow-visible gap-0 rounded-2xl py-0 ring-1 ring-slate-900/[0.04]">
      <div className={`absolute left-0 top-0 h-1 w-full rounded-t-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`animate-count-up mt-2 text-2xl font-bold tabular-nums ${valueClassName ?? "text-slate-800"}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        {tip && <StatCardHelp tip={tip} />}
      </div>
    </Card>
  );
}

export default function DashboardInsights({
  insights,
}: {
  insights: DashboardInsightsData | null;
}) {
  const kpis = insights?.kpis;
  const charts = insights?.charts;
  const capitalTrend = normalizeCapitalTrend(charts);
  const capitalInvested = kpis?.total_capital_invested ?? 0;
  const totalCapital = kpis?.total_capital ?? kpis?.capital_budget ?? 0;
  const capitalBudget = kpis?.capital_budget ?? 0;
  const capitalUtilPct = kpis?.capital_utilization_pct ?? 0;
  const overBudget = totalCapital > 0 && capitalInvested > totalCapital;

  return (
    <div className="space-y-4">
      {/* KPI cards — 4-column grid */}
      <div className="animate-stagger-fade-up grid grid-cols-2 gap-4 overflow-visible md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Capital"
          value={fmtCurrency(totalCapital)}
          sub={`${fmtCurrency(capitalInvested)} deployed (${capitalUtilPct.toFixed(0)}%) · budget ${fmtCurrency(capitalBudget)} + P&L`}
          tip="Total capital = starting budget + cumulative realized P&L (profits add, losses subtract). Deployed = open CSP + stock held. New trades cannot push deployed capital above total capital."
          accent={overBudget ? KPI_ACCENT.loss : KPI_ACCENT.capital}
          valueClassName={overBudget ? "text-loss" : "text-slate-800"}
        />
        <StatCard
          label="Total Premium"
          value={fmtCurrency(kpis?.total_premium ?? 0)}
          sub="Gross premium, all legs"
          tip="Sum of premium × contracts × 100 for every trade (includes open, rolled, and bought-back legs). Not net cash after fees or buybacks."
          accent={KPI_ACCENT.premium}
        />
        <StatCard
          label="Realized P&L"
          value={fmtCurrency(kpis?.realized_pnl ?? 0)}
          sub="Option cashflow + stock sales"
          tip="Net option cashflow (premium − fees − buyback) on CLOSED, EXPIRED, ROLLED, CALLED_AWAY, and ASSIGNED legs, plus stock P&L when CC shares are called away (strike − assignment basis)."
          accent={KPI_ACCENT.profit}
          valueClassName={profitLossClass(kpis?.realized_pnl ?? 0)}
        />
        <StatCard
          label="Yearly Income"
          value={fmtCurrency(kpis?.yearly_income ?? 0)}
          sub={`${fmtCurrency(kpis?.daily_avg_income ?? 0)} / day`}
          tip="Projection only: (total gross premium ÷ days since first trade) × 365. Not realized income; ignores fees, buybacks, and assignment timing."
          accent={KPI_ACCENT.premium}
        />
        <StatCard
          label="Open Premium Ann. Yield"
          value={fmtPercent(kpis?.open_premium_annualized_yield ?? kpis?.avg_annual_roi ?? 0)}
          sub="Based on open premium and capital"
          tip="(sum of open-leg gross premium ÷ total capital invested) × (365 ÷ simple average DTE of open legs). Uses unweighted DTE, not the premium-weighted DTE on the card below."
          accent={KPI_ACCENT.ratio}
        />
        <StatCard
          label="Realized Annual ROI"
          value={fmtPercent(kpis?.realized_annual_roi ?? 0)}
          sub="Annualized · simple avg hold"
          tip="(realized P&L ÷ capital at risk on realized legs) × (365 ÷ simple average holding days). Annualized projection using unweighted average hold time."
          accent={KPI_ACCENT.ratio}
        />
        <StatCard
          label="Period Return"
          value={fmtPercent(kpis?.cumulative_total_return_pct ?? 0)}
          sub={
            kpis?.time_weighted_return_unreliable
              ? `Realized ${fmtCurrency(kpis?.realized_pnl ?? 0)} · TWR ${fmtPercent(kpis?.time_weighted_return_pct ?? 0)} · large flows — trust realized $`
              : `Realized ${fmtCurrency(kpis?.realized_pnl ?? 0)} · TWR ${fmtPercent(kpis?.time_weighted_return_pct ?? 0)}`
          }
          tip="Main value = return on starting capital for the period: (end − start − net deposits) ÷ start. Subtitle shows dollars earned (realized P&L) and time-weighted return (TWR), which adjusts for deposit/withdrawal timing. When large flows make TWR unreliable, focus on realized $ and period return %."
          accent={kpis?.time_weighted_return_unreliable ? KPI_ACCENT.warning : KPI_ACCENT.ratio}
        />
        <StatCard
          label="Win Rate"
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub="Based on strategy outcomes"
          tip="Wins ÷ terminal legs (CLOSED, EXPIRED, ASSIGNED, CALLED_AWAY). Win = OTM expire, called away, or CLOSED with positive net cashflow. ASSIGNED CSP counts in the denominator but not as a win."
          accent={KPI_ACCENT.ratio}
        />
        <StatCard
          label="Active Trades"
          value={String(kpis?.active_trades ?? 0)}
          sub="OPEN, expiry not passed"
          tip="Count of OPEN legs with expiry on or after today (same as Trades → Today filter)."
          accent={KPI_ACCENT.count}
        />
        <StatCard
          label="Avg Premium / Weighted DTE"
          value={fmtCurrency(kpis?.avg_premium_per_active_day ?? 0)}
          sub={
            (kpis?.weighted_open_dte ?? 0) > 0
              ? `Avg DTE: ${(kpis?.weighted_open_dte ?? 0).toFixed(1)} days`
              : "No open positions"
          }
          tip="Weighted open DTE = Σ(premium × DTE) ÷ Σ(premium). Avg premium/day = open premium ÷ weighted open DTE."
          accent={KPI_ACCENT.count}
        />
      </div>

      {/* Charts — premium row + capital trend */}
      <div className="animate-stagger-fade-up grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarChartCard
          title="Daily Premium (by open date)"
          points={charts?.daily_premium_income ?? []}
          gradient="bg-gradient-to-t from-blue-500 to-sky-300"
        />
        <BarChartCard
          title="Weekly Premium (by open date)"
          points={charts?.weekly_premium_income ?? []}
          gradient="bg-gradient-to-t from-violet-600 to-fuchsia-300"
        />
        <BarChartCard
          title="Monthly Premium (by open date)"
          points={charts?.monthly_premium_income ?? []}
          gradient="bg-gradient-to-t from-indigo-600 to-blue-300"
        />
      </div>
      <div className="animate-stagger-fade-up">
        <CapitalTrendChart
          trend={capitalTrend}
          budgetLine={
            !kpis?.has_capital_flows && capitalBudget > 0 ? capitalBudget : undefined
          }
          overBudget={overBudget}
        />
      </div>
    </div>
  );
}
