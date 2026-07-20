"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { CARD_BASE, KPI_ACCENT, profitLossClass } from "@/app/components/ui/styles";
import { Card } from "@/components/ui/card";
import {
  computeUnrealizedStockMtm,
  openAssignedPositions,
} from "@/lib/cycles/ccCostBasis";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";
import type {
  CapitalTrendCharts,
  DashboardInsights as DashboardInsightsData,
  DashboardSeriesPoint,
  Trade,
} from "@/lib/api/trades";

type TrendGranularity = "week" | "month";
type TrendRange = "ytd" | "1y";

const TOOLTIP_MAX_W = 224;
const TOOLTIP_GAP = 8;
const VIEWPORT_PAD = 12;

function StatCardHelp({ tip, ariaLabel }: { tip: string; ariaLabel: string }) {
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
        aria-label={ariaLabel}
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

function fmtCurrency(value: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Explicit +/− prefix so budget ± P&L never reads as "+ -US$…". */
function fmtSignedCurrency(value: number, intlLocale: string): string {
  const abs = fmtCurrency(Math.abs(value), intlLocale);
  if (value < 0) return `− ${abs}`;
  return `+ ${abs}`;
}

function fmtPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function BarChartCard({
  title,
  points,
  gradient,
  intlLocale,
  noDataLabel,
}: {
  title: string;
  points: { label: string; value: number }[];
  gradient: string;
  intlLocale: string;
  noDataLabel: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const recentPoints = points.slice(-6);
  return (
    <div className={`${CARD_BASE} p-5`}>
      <p className="mb-4 text-sm font-semibold text-slate-800">{title}</p>
      <div className="flex h-40 items-end gap-2">
        {points.length === 0 ? (
          <p className="text-sm text-slate-400">{noDataLabel}</p>
        ) : (
          points.map((p, i) => {
            const height = Math.max(16, Math.round((p.value / max) * 128));
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-600">
                  {fmtCurrency(p.value, intlLocale)}
                </span>
                <div
                  className={`animate-bar-grow w-full rounded-md transition-[filter] duration-150 hover:brightness-110 ${gradient}`}
                  style={{ height: `${height}px`, animationDelay: `${i * 60}ms` }}
                  title={`${p.label}: ${fmtCurrency(p.value, intlLocale)}`}
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
                <span className="font-semibold text-slate-700">
                  {fmtCurrency(p.value, intlLocale)}
                </span>
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
  granularity: TrendGranularity,
  intlLocale: string
): string {
  if (point.date) {
    const [y, m, d] = point.date.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (granularity === "month") {
      return new Intl.DateTimeFormat(intlLocale, { month: "short", year: "numeric" }).format(dt);
    }
    return new Intl.DateTimeFormat(intlLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dt);
  }
  return point.label;
}

function formatTrendAxisLabel(
  point: DashboardSeriesPoint,
  granularity: TrendGranularity,
  intlLocale: string
): string {
  if (point.date) {
    const [y, m, d] = point.date.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (granularity === "month") {
      return new Intl.DateTimeFormat(intlLocale, { month: "short" }).format(dt);
    }
    return new Intl.DateTimeFormat(intlLocale, { month: "numeric", day: "numeric" }).format(dt);
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
  intlLocale,
  t,
  metricDetailsLabel,
  noDataLabel,
  ariaLabel,
}: {
  trend: CapitalTrendCharts | undefined;
  budgetLine?: number;
  overBudget: boolean;
  intlLocale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  metricDetailsLabel: string;
  noDataLabel: string;
  ariaLabel: string;
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
    range === "ytd" ? t("chart.capitalTrendRangeYtd") : t("chart.capitalTrendRange1y");

  const budgetLineText =
    budgetLine != null && budgetLine > 0
      ? t("chart.capitalTrendBudgetLine", { amount: fmtCurrency(budgetLine, intlLocale) })
      : t("chart.capitalTrendNoBudget");

  return (
    <div className={`${CARD_BASE} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{t("chart.capitalTrend")}</p>
          <StatCardHelp
            ariaLabel={metricDetailsLabel}
            tip={t("chart.capitalTrendTip", {
              budgetLine: budgetLineText,
              rangeHint,
            })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentToggle
            value={granularity}
            options={[
              { id: "week", label: t("chart.granularity.week") },
              { id: "month", label: t("chart.granularity.month") },
            ]}
            onChange={setGranularity}
          />
          <SegmentToggle
            value={range}
            options={[
              { id: "ytd", label: t("chart.range.ytd") },
              { id: "1y", label: t("chart.range.oneYear") },
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
        intlLocale={intlLocale}
        noDataLabel={noDataLabel}
        vsBudgetLabel={(sign, amount) => t("chart.vsBudget", { sign, amount })}
        ariaLabel={ariaLabel}
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
  intlLocale,
  noDataLabel,
  vsBudgetLabel,
  ariaLabel,
}: {
  title?: string;
  points: DashboardSeriesPoint[];
  stroke: string;
  fill: string;
  budgetLine?: number;
  granularity?: TrendGranularity;
  embedded?: boolean;
  intlLocale: string;
  noDataLabel: string;
  vsBudgetLabel: (sign: string, amount: string) => string;
  ariaLabel: string;
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
        <p className="text-sm text-slate-400">{noDataLabel}</p>
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
                {formatTrendPeriod(hovered, granularity, intlLocale)}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
                {fmtCurrency(hovered.value, intlLocale)}
              </p>
              {budgetLine != null && budgetLine > 0 && (
                <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                  {vsBudgetLabel(
                    hovered.value >= budgetLine ? "+" : "",
                    fmtCurrency(hovered.value - budgetLine, intlLocale)
                  )}
                </p>
              )}
            </div>
          )}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={embedded ? "h-56 w-full" : "h-44 w-full"}
            role="img"
            aria-label={title ?? ariaLabel}
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
                    {fmtCurrency(tick, intlLocale)}
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
                  {formatTrendAxisLabel(p, granularity, intlLocale)}
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
  metricDetailsLabel,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  tip?: string;
  valueClassName?: string;
  metricDetailsLabel: string;
}) {
  return (
    <Card className="card-hover-lift relative overflow-visible gap-0 rounded-2xl py-0 ring-1 ring-slate-900/[0.04]">
      <div className={`absolute left-0 top-0 h-1 w-full rounded-t-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-1.5 p-3 sm:gap-2 sm:p-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={`animate-count-up mt-1.5 font-bold tabular-nums leading-tight tracking-tight sm:mt-2 ${valueClassName ?? "text-slate-800"} text-[clamp(0.95rem,3.6vw,1.5rem)] sm:text-xl md:text-2xl`}
          >
            {value}
          </p>
          <p className="mt-1 break-words text-[11px] leading-snug text-slate-500 sm:text-xs">
            {sub}
          </p>
        </div>
        {tip && <StatCardHelp tip={tip} ariaLabel={metricDetailsLabel} />}
      </div>
    </Card>
  );
}

export default function DashboardInsights({
  insights,
  trades = [],
}: {
  insights: DashboardInsightsData | null;
  trades?: Trade[];
}) {
  const { t } = useTranslations("dashboard");
  const { t: tCommon } = useTranslations("common");
  const { intlLocale } = useLocale();
  const metricDetailsLabel = tCommon("a11y.metricDetails");
  const noDataLabel = tCommon("empty.noData");

  const heldTickers = useMemo(
    () => openAssignedPositions(trades).map((p) => p.ticker),
    [trades]
  );
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (heldTickers.length === 0) return;
    const symbols = heldTickers.join(",");
    let cancelled = false;
    fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}`)
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        if (!cancelled) setLivePrices(data);
      })
      .catch(() => {
        /* keep backend MTM / realized-only fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [heldTickers]);

  const frontendMtm = useMemo(() => {
    if (heldTickers.length === 0) return null;
    if (!heldTickers.some((t) => livePrices[t] != null && Number.isFinite(livePrices[t]))) {
      return null;
    }
    return computeUnrealizedStockMtm(trades, livePrices);
  }, [heldTickers, livePrices, trades]);

  const baseKpis = insights?.kpis;
  const realizedPnl = baseKpis?.realized_pnl ?? 0;
  const capitalBudget = baseKpis?.capital_budget ?? 0;
  const capitalInvested = baseKpis?.total_capital_invested ?? 0;

  // Prefer Vercel /api/quote MTM (same path as Cycles). Backend Yahoo from Render often fails.
  const unrealizedMtm = frontendMtm ?? baseKpis?.unrealized_stock_mtm ?? 0;
  const totalPnl = realizedPnl + unrealizedMtm;
  const totalCapital =
    frontendMtm != null
      ? capitalBudget + realizedPnl + unrealizedMtm
      : (baseKpis?.total_capital ?? capitalBudget);
  const capitalUtilPct =
    totalCapital > 0 ? (capitalInvested / totalCapital) * 100 : (baseKpis?.capital_utilization_pct ?? 0);
  const overBudget = totalCapital > 0 && capitalInvested > totalCapital;

  const charts = insights?.charts;
  const capitalTrend = useMemo(() => {
    const trend = normalizeCapitalTrend(charts);
    if (frontendMtm == null || !trend) return trend;
    const backendMtm = baseKpis?.unrealized_stock_mtm ?? 0;
    const delta = unrealizedMtm - backendMtm;
    if (delta === 0) return trend;
    const bump = (points: DashboardSeriesPoint[]) =>
      points.length === 0
        ? points
        : points.map((p, i) =>
            i === points.length - 1 ? { ...p, value: p.value + delta } : p
          );
    return {
      weekly: bump(trend.weekly),
      monthly: bump(trend.monthly),
    };
  }, [charts, frontendMtm, baseKpis?.unrealized_stock_mtm, unrealizedMtm]);

  const kpis = baseKpis;

  return (
    <div className="space-y-4">
      <div className="animate-stagger-fade-up grid grid-cols-2 gap-4 overflow-visible md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label={t("kpi.totalCapital.label")}
          value={fmtCurrency(totalCapital, intlLocale)}
          sub={t("kpi.totalCapital.sub", {
            deployed: fmtCurrency(capitalInvested, intlLocale),
            pct: capitalUtilPct.toFixed(0),
            budget: fmtCurrency(capitalBudget, intlLocale),
            netPnl: fmtSignedCurrency(totalPnl, intlLocale),
          })}
          tip={t("kpi.totalCapital.tip")}
          accent={overBudget ? KPI_ACCENT.loss : KPI_ACCENT.capital}
          valueClassName={overBudget ? "text-loss" : "text-slate-800"}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.totalPremium.label")}
          value={fmtCurrency(kpis?.total_premium ?? 0, intlLocale)}
          sub={t("kpi.totalPremium.sub")}
          tip={t("kpi.totalPremium.tip")}
          accent={KPI_ACCENT.premium}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.realizedPnl.label")}
          value={fmtCurrency(totalPnl, intlLocale)}
          sub={t("kpi.realizedPnl.sub", {
            realized: fmtCurrency(realizedPnl, intlLocale),
            mtm: fmtSignedCurrency(unrealizedMtm, intlLocale),
          })}
          tip={t("kpi.realizedPnl.tip")}
          accent={KPI_ACCENT.profit}
          valueClassName={profitLossClass(totalPnl)}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.yearlyIncome.label")}
          value={fmtCurrency(kpis?.yearly_income ?? 0, intlLocale)}
          sub={t("kpi.yearlyIncome.sub", {
            daily: fmtCurrency(kpis?.daily_avg_income ?? 0, intlLocale),
          })}
          tip={t("kpi.yearlyIncome.tip")}
          accent={KPI_ACCENT.premium}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.openPremiumYield.label")}
          value={fmtPercent(kpis?.open_premium_annualized_yield ?? kpis?.avg_annual_roi ?? 0)}
          sub={t("kpi.openPremiumYield.sub")}
          tip={t("kpi.openPremiumYield.tip")}
          accent={KPI_ACCENT.ratio}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.realizedRoi.label")}
          value={fmtPercent(kpis?.realized_annual_roi ?? 0)}
          sub={t("kpi.realizedRoi.sub")}
          tip={t("kpi.realizedRoi.tip")}
          accent={KPI_ACCENT.ratio}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.periodReturn.label")}
          value={fmtPercent(kpis?.cumulative_total_return_pct ?? 0)}
          sub={
            kpis?.time_weighted_return_unreliable
              ? t("kpi.periodReturn.subUnreliable", {
                  amount: fmtCurrency(totalPnl, intlLocale),
                  twr: fmtPercent(kpis?.time_weighted_return_pct ?? 0),
                })
              : t("kpi.periodReturn.sub", {
                  amount: fmtCurrency(totalPnl, intlLocale),
                  twr: fmtPercent(kpis?.time_weighted_return_pct ?? 0),
                })
          }
          tip={t("kpi.periodReturn.tip")}
          accent={kpis?.time_weighted_return_unreliable ? KPI_ACCENT.warning : KPI_ACCENT.ratio}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.winRate.label")}
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub={t("kpi.winRate.sub")}
          tip={t("kpi.winRate.tip")}
          accent={KPI_ACCENT.ratio}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.activeTrades.label")}
          value={String(kpis?.active_trades ?? 0)}
          sub={t("kpi.activeTrades.sub")}
          tip={t("kpi.activeTrades.tip")}
          accent={KPI_ACCENT.count}
          metricDetailsLabel={metricDetailsLabel}
        />
        <StatCard
          label={t("kpi.avgPremiumDte.label")}
          value={fmtCurrency(kpis?.avg_premium_per_active_day ?? 0, intlLocale)}
          sub={
            (kpis?.weighted_open_dte ?? 0) > 0
              ? t("kpi.avgPremiumDte.sub", {
                  days: (kpis?.weighted_open_dte ?? 0).toFixed(1),
                })
              : t("kpi.avgPremiumDte.subEmpty")
          }
          tip={t("kpi.avgPremiumDte.tip")}
          accent={KPI_ACCENT.count}
          metricDetailsLabel={metricDetailsLabel}
        />
      </div>

      <div className="animate-stagger-fade-up grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarChartCard
          title={t("chart.dailyPremium")}
          points={charts?.daily_premium_income ?? []}
          gradient="bg-gradient-to-t from-blue-500 to-sky-300"
          intlLocale={intlLocale}
          noDataLabel={noDataLabel}
        />
        <BarChartCard
          title={t("chart.weeklyPremium")}
          points={charts?.weekly_premium_income ?? []}
          gradient="bg-gradient-to-t from-violet-600 to-fuchsia-300"
          intlLocale={intlLocale}
          noDataLabel={noDataLabel}
        />
        <BarChartCard
          title={t("chart.monthlyPremium")}
          points={charts?.monthly_premium_income ?? []}
          gradient="bg-gradient-to-t from-indigo-600 to-blue-300"
          intlLocale={intlLocale}
          noDataLabel={noDataLabel}
        />
      </div>
      <div className="animate-stagger-fade-up">
        <CapitalTrendChart
          trend={capitalTrend}
          budgetLine={
            !kpis?.has_capital_flows && capitalBudget > 0 ? capitalBudget : undefined
          }
          overBudget={overBudget}
          intlLocale={intlLocale}
          t={t}
          metricDetailsLabel={metricDetailsLabel}
          noDataLabel={noDataLabel}
          ariaLabel={t("chart.ariaCapitalTrend")}
        />
      </div>
    </div>
  );
}
