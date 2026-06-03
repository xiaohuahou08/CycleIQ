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
    <div className="glass-card p-5 rounded-2xl chart-grid relative overflow-hidden">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#E1E2E7]">{title}</p>
      <div className="flex h-40 items-end gap-2 px-1">
        {points.length === 0 ? (
          <p className="text-xs text-slate-500">No data available</p>
        ) : (
          points.map((p) => {
            const height = Math.max(16, Math.round((p.value / max) * 128));
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1 group relative">
                {/* Micro tooltip on hover of each bar */}
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-[#15191C] border border-[#2D3439] px-2 py-0.5 text-[9px] font-bold text-[#E1E2E7] opacity-0 transition-opacity group-hover:opacity-100 z-10 whitespace-nowrap shadow-lg">
                  {fmtCurrency(p.value)}
                </span>
                <span className="text-[9px] font-bold text-slate-400">{fmtCurrency(p.value)}</span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-200 hover:brightness-125 ${gradient}`}
                  style={{ height: `${height}px` }}
                  title={`${p.label}: ${fmtCurrency(p.value)}`}
                />
                <span className="truncate text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">{p.label}</span>
              </div>
            );
          })
        )}
      </div>
      {recentPoints.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#2D3439] bg-[#111417]/50 p-3">
          <div className="space-y-1">
            {recentPoints.map((p) => (
              <div
                key={`${title}-${p.label}`}
                className="flex items-center justify-between rounded px-1.5 py-0.5 text-xs"
              >
                <span className="truncate text-[#94A3B8] font-medium">{p.label}</span>
                <span className="font-bold text-[#E1E2E7]">{fmtCurrency(p.value)}</span>
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
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-200 hover:border-[#d0bcff]/40">
      <div className={`absolute left-0 top-0 h-1 w-full ${accent}`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#E1E2E7] font-data-mono">{value}</p>
          <p className="mt-1 text-xs text-[#94A3B8] opacity-60 font-medium">{sub}</p>
        </div>
        {tip && (
          <div className="group relative ml-2 shrink-0">
            {/* Info Icon - Redesigned to be highly elegant and clear */}
            <span className="flex h-5.5 w-5.5 cursor-help items-center justify-center rounded-full border border-[#2D3439] bg-[#1D2023] text-[10px] font-extrabold text-[#94A3B8] transition-all duration-150 group-hover:bg-[#2D3439] group-hover:text-[#E1E2E7] select-none shadow-sm">
              ?
            </span>
            {/* Tooltip Content - Beautified and placed offset with premium contrast */}
            <div className="pointer-events-none absolute bottom-full right-0 mb-2.5 w-60 origin-bottom-right scale-95 rounded-xl border border-[#2D3439] bg-[#15191C]/98 backdrop-blur-md px-3.5 py-2.5 text-[11px] leading-relaxed text-[#E1E2E7] shadow-2xl opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto z-50">
              {tip}
              {/* Arrow */}
              <div className="absolute top-full right-2 h-1.5 w-1.5 -translate-y-[3.3px] rotate-45 bg-[#15191C]/98 border-r border-b border-[#2D3439]" />
            </div>
          </div>
        )}
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
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#2D3439] bg-[#15191C]/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-[#2D3439] bg-[#15191C]/50" />
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
          accent="bg-[#4cd7f6]"
        />
        <StatCard
          label="Total Premium"
          value={fmtCurrency(kpis?.total_premium ?? 0)}
          sub="Total premium collected"
          tip="Σ (premium × contracts × 100) across all trades."
          accent="bg-[#8B5CF6]"
        />
        <StatCard
          label="Realized P&L"
          value={fmtCurrency(kpis?.realized_pnl ?? 0)}
          sub="From closed trades"
          tip="Σ realized option cashflow (premium − fees − buyback for rolled legs) + stock sale P&L from called-away shares."
          accent="bg-[#4edea3]"
        />
        <StatCard
          label="Yearly Income"
          value={fmtCurrency(kpis?.yearly_income ?? 0)}
          sub={`${fmtCurrency(kpis?.daily_avg_income ?? 0)} / day`}
          tip="Daily avg = total premium ÷ days since first trade. Yearly income = daily avg × 365."
          accent="bg-[#4edea3]"
        />
        <StatCard
          label="Open Premium Ann. Yield"
          value={fmtPercent(kpis?.open_premium_annualized_yield ?? kpis?.avg_annual_roi ?? 0)}
          sub="Based on open premium and capital"
          tip="(open premium ÷ capital at risk) × (365 ÷ avg open DTE)."
          accent="bg-[#8B5CF6]"
        />
        <StatCard
          label="Realized Annual ROI"
          value={fmtPercent(kpis?.realized_annual_roi ?? 0)}
          sub="Based on closed premium"
          tip="(realized P&L ÷ realized capital at risk) × (365 ÷ avg closed holding days)."
          accent="bg-[#4cd7f6]"
        />
        <StatCard
          label="Win Rate"
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub="Based on strategy outcomes"
          tip="wins ÷ terminal trades. Wins = EXPIRED/CALLED_AWAY, or CLOSED with positive realized cashflow."
          accent="bg-[#d0bcff]"
        />
        <StatCard
          label="Active Trades"
          value={String(kpis?.active_trades ?? 0)}
          sub="OPEN positions"
          tip="Count of trades with status OPEN."
          accent="bg-[#8B5CF6]"
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
          accent="bg-[#8B5CF6]"
        />
      </div>

      {/* Stock position section (wheel strategy) */}
      {((kpis?.total_stock_effective_cost ?? 0) > 0 ||
        (kpis?.total_cc_basis_reduction ?? 0) > 0 ||
        (kpis?.stock_sale_pnl ?? 0) !== 0) && (
        <div className="glass-card border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-5 rounded-2xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">
            Stock Positions — Wheel Cost Basis
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(kpis?.total_stock_effective_cost ?? 0) > 0 && (
              <div className="glass-card bg-[#111417] border-[#2D3439] hover:border-[#8B5CF6]/30 px-4 py-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Effective Stock Cost</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-[#8B5CF6] font-data-mono">
                  {fmtCurrency(kpis?.total_stock_effective_cost ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Held shares at adjusted basis</p>
              </div>
            )}
            {(kpis?.total_cc_basis_reduction ?? 0) > 0 && (
              <div className="glass-card bg-[#111417] border-[#2D3439] hover:border-[#4edea3]/30 px-4 py-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">CC Basis Reduction</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-[#4edea3] font-data-mono">
                  {fmtCurrency(kpis?.total_cc_basis_reduction ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Expired / closed CC premiums credited</p>
              </div>
            )}
            {(kpis?.stock_sale_pnl ?? 0) !== 0 && (
              <div className="glass-card bg-[#111417] border-[#2D3439] hover:border-[#4cd7f6]/30 px-4 py-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Stock Sale P&amp;L</p>
                <p className={`mt-1 text-xl font-bold tabular-nums font-data-mono ${(kpis?.stock_sale_pnl ?? 0) >= 0 ? "text-[#4edea3]" : "text-rose-500"}`}>
                  {(kpis?.stock_sale_pnl ?? 0) >= 0 ? "+" : "−"}
                  {fmtCurrency(Math.abs(kpis?.stock_sale_pnl ?? 0))}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">From shares called away</p>
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
          gradient="bg-gradient-to-t from-[#8B5CF6]/20 to-[#8B5CF6]"
        />
        <BarChartCard
          title="Weekly Premium Income"
          points={charts?.weekly_premium_income ?? []}
          gradient="bg-gradient-to-t from-[#4cd7f6]/20 to-[#4cd7f6]"
        />
        <BarChartCard
          title="Monthly Premium Income"
          points={charts?.monthly_premium_income ?? []}
          gradient="bg-gradient-to-t from-[#4edea3]/20 to-[#4edea3]"
        />
      </div>
    </div>
  );
}
