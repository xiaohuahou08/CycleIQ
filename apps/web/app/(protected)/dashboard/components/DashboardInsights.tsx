"use client";

import type { DashboardInsights as DashboardInsightsData } from "@/lib/api/trades";

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
          points.map((p) => {
            const height = Math.max(16, Math.round((p.value / max) * 128));
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-600">{fmtCurrency(p.value)}</span>
                <div
                  className={`w-full rounded-md ${gradient}`}
                  style={{ height: `${height}px` }}
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 w-full ${accent}`} />
      <div className="p-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
      {tip && (
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 hidden rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[11px] leading-snug text-slate-600 shadow-lg backdrop-blur group-hover:block">
          {tip}
        </div>
      )}
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Capital Invested"
          value={fmtCurrency(kpis?.total_capital_invested ?? 0)}
          sub="Capital in open trades"
          tip="Σ (open trade strike × contracts × 100). For open CALL, use effective stock basis when available."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Total Premium"
          value={fmtCurrency(kpis?.total_premium ?? 0)}
          sub="Total premium collected"
          tip="Σ (premium × contracts × 100) across all trades."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Realized P&L"
          value={fmtCurrency(kpis?.realized_pnl ?? 0)}
          sub="From closed trades"
          tip="Σ realized option cashflow (premium − fees − buyback for rolled legs) + stock sale P&L from called-away shares."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Yearly Income"
          value={fmtCurrency(kpis?.yearly_income ?? 0)}
          sub={`${fmtCurrency(kpis?.daily_avg_income ?? 0)} / day`}
          tip="Daily avg = total premium ÷ days since first trade. Yearly income = daily avg × 365."
          accent="bg-emerald-400"
        />
        <StatCard
          label="Open Premium Ann. Yield"
          value={fmtPercent(kpis?.open_premium_annualized_yield ?? kpis?.avg_annual_roi ?? 0)}
          sub="Based on open premium and capital"
          tip="(open premium ÷ capital at risk) × (365 ÷ avg open DTE)."
          accent="bg-blue-400"
        />
        <StatCard
          label="Realized Annual ROI"
          value={fmtPercent(kpis?.realized_annual_roi ?? 0)}
          sub="Based on closed premium"
          tip="(realized P&L ÷ realized capital at risk) × (365 ÷ avg closed holding days)."
          accent="bg-blue-400"
        />
        <StatCard
          label="Win Rate"
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub="Based on strategy outcomes"
          tip="wins ÷ terminal trades. Wins = EXPIRED/CALLED_AWAY, or CLOSED with positive realized cashflow."
          accent="bg-blue-400"
        />
        <StatCard
          label="Active Trades"
          value={String(kpis?.active_trades ?? 0)}
          sub="OPEN positions"
          tip="Count of trades with status OPEN."
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

      {/* Stock position section (wheel strategy) */}
      {((kpis?.total_stock_effective_cost ?? 0) > 0 ||
        (kpis?.total_cc_basis_reduction ?? 0) > 0 ||
        (kpis?.stock_sale_pnl ?? 0) !== 0) && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-purple-600">
            Stock Positions — Wheel Cost Basis
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(kpis?.total_stock_effective_cost ?? 0) > 0 && (
              <div className="rounded-xl border border-purple-100 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-400">Effective Stock Cost</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-purple-700">
                  {fmtCurrency(kpis?.total_stock_effective_cost ?? 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Held shares at adjusted basis</p>
              </div>
            )}
            {(kpis?.total_cc_basis_reduction ?? 0) > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-400">CC Basis Reduction</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600">
                  {fmtCurrency(kpis?.total_cc_basis_reduction ?? 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Expired / closed CC premiums credited</p>
              </div>
            )}
            {(kpis?.stock_sale_pnl ?? 0) !== 0 && (
              <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-400">Stock Sale P&amp;L</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${(kpis?.stock_sale_pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {(kpis?.stock_sale_pnl ?? 0) >= 0 ? "+" : "−"}
                  {fmtCurrency(Math.abs(kpis?.stock_sale_pnl ?? 0))}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">From shares called away</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts — 3-column row on large screens */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarChartCard
          title="Daily Premium Income"
          points={charts?.daily_premium_income ?? []}
          gradient="bg-gradient-to-t from-blue-500 to-sky-300"
        />
        <BarChartCard
          title="Weekly Premium Income"
          points={charts?.weekly_premium_income ?? []}
          gradient="bg-gradient-to-t from-violet-600 to-fuchsia-300"
        />
        <BarChartCard
          title="Monthly Premium Income"
          points={charts?.monthly_premium_income ?? []}
          gradient="bg-gradient-to-t from-indigo-600 to-blue-300"
        />
      </div>
    </div>
  );
}
