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
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-gray-900">{title}</p>
      <div className="flex h-28 items-end gap-2">
        {points.length === 0 ? (
          <p className="text-xs text-gray-400">No data</p>
        ) : (
          points.map((p) => {
            const height = Math.max(8, Math.round((p.value / max) * 92));
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-gray-500">{fmtCurrency(p.value)}</span>
                <div
                  className={`w-full rounded-md ${gradient}`}
                  style={{ height: `${height}px` }}
                  title={`${p.label}: ${fmtCurrency(p.value)}`}
                />
                <span className="truncate text-[10px] text-gray-400">{p.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Capital Invested"
          value={fmtCurrency(kpis?.total_capital_invested ?? 0)}
          sub="Capital in open trades"
        />
        <StatCard
          label="Total Premium"
          value={fmtCurrency(kpis?.total_premium ?? 0)}
          sub="Total premium collected"
        />
        <StatCard
          label="Realized P&L"
          value={fmtCurrency(kpis?.realized_pnl ?? 0)}
          sub="From closed trades"
        />
        <StatCard
          label="Avg. Annual ROI"
          value={fmtPercent(kpis?.avg_annual_roi ?? 0)}
          sub="Projected annualized return"
        />
        <StatCard
          label="Active Trades"
          value={String(kpis?.active_trades ?? 0)}
          sub="OPEN positions"
        />
        <StatCard
          label="Win Rate"
          value={fmtPercent(kpis?.win_rate ?? 0)}
          sub="Based on strategy outcomes"
        />
        <StatCard
          label="Avg Premium / Active Days"
          value={fmtCurrency(kpis?.avg_premium_per_active_day ?? 0)}
          sub={`From ${kpis?.active_days ?? 0} active days`}
        />
        <StatCard
          label="Yearly Income"
          value={fmtCurrency(kpis?.yearly_income ?? 0)}
          sub={`${fmtCurrency(kpis?.daily_avg_income ?? 0)} / day`}
        />
      </div>

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
          gradient="bg-gradient-to-t from-emerald-600 to-teal-300"
        />
      </div>
    </div>
  );
}

