"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import type { DashboardInsights as DashboardInsightsData } from "@/lib/api/trades";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  className={`animate-bar-grow w-full rounded-md ${gradient}`}
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

function StatCard({
  label,
  value,
  sub,
  accent,
  tip,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  tip?: string;
}) {
  return (
    <div className="card-hover-lift relative overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full rounded-t-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        {tip && <StatCardHelp tip={tip} />}
      </div>
    </div>
  );
}

export default function DashboardInsights({
  insights,
  loading,
}: {
  insights: DashboardInsightsData | null;
  loading: boolean;
}) {
  const kpis = insights?.kpis;
  const charts = insights?.charts;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards — 4-column grid */}
      <div className="animate-stagger-fade-up grid grid-cols-2 gap-4 overflow-visible md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Capital Invested"
          value={fmtCurrency(kpis?.total_capital_invested ?? 0)}
          sub="Open CSP cash + stock held"
          tip="Open CSP (expiry not passed) strike × shares + effective stock cost after assignment (CC premiums reduce basis). Open CC does not add capital."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Total Premium"
          value={fmtCurrency(kpis?.total_premium ?? 0)}
          sub="Gross premium, all legs"
          tip="Sum of premium × contracts × 100 for every trade (includes open, rolled, and bought-back legs). Not net cash after fees or buybacks."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Realized P&L"
          value={fmtCurrency(kpis?.realized_pnl ?? 0)}
          sub="Option cashflow + stock sales"
          tip="Net option cashflow (premium − fees − buyback) on CLOSED, EXPIRED, ROLLED, CALLED_AWAY, and ASSIGNED legs, plus stock P&L when CC shares are called away (strike − assignment basis)."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Yearly Income"
          value={fmtCurrency(kpis?.yearly_income ?? 0)}
          sub={`${fmtCurrency(kpis?.daily_avg_income ?? 0)} / day`}
          tip="Projection only: (total gross premium ÷ days since first trade) × 365. Not realized income; ignores fees, buybacks, and assignment timing."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Open Premium Ann. Yield"
          value={fmtPercent(kpis?.open_premium_annualized_yield ?? kpis?.avg_annual_roi ?? 0)}
          sub="Based on open premium and capital"
          tip="(sum of open-leg gross premium ÷ total capital invested) × (365 ÷ simple average DTE of open legs). Uses unweighted DTE, not the premium-weighted DTE on the card below."
          accent="bg-blue-400"
        />
        <StatCard
          label="Realized Annual ROI"
          value={fmtPercent(kpis?.realized_annual_roi ?? 0)}
          sub="Annualized realized return"
          tip="(realized P&L ÷ capital at risk on realized legs) × (365 ÷ average holding days from open to completion). Includes ASSIGNED CSP in both numerator and denominator."
          accent="bg-blue-400"
        />
        <StatCard
          label="Win Rate"
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub="Based on strategy outcomes"
          tip="Wins ÷ terminal legs (CLOSED, EXPIRED, ASSIGNED, CALLED_AWAY). Win = OTM expire, called away, or CLOSED with positive net cashflow. ASSIGNED CSP counts in the denominator but not as a win."
          accent="bg-blue-400"
        />
        <StatCard
          label="Active Trades"
          value={String(kpis?.active_trades ?? 0)}
          sub="OPEN, expiry not passed"
          tip="Count of OPEN legs with expiry on or after today (same as Trades → Today filter)."
          accent="bg-violet-400"
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
          accent="bg-violet-400"
        />
      </div>

      {/* Charts — 3-column row on large screens */}
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
    </div>
  );
}
