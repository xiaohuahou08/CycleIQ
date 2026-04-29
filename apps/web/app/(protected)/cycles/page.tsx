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

  if (isAuthLoading) return null;

  return (
    <main className="flex-1 bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Cycles</h1>
          <p className="mt-2 text-sm text-gray-500">
            Cycle-level view of your wheel strategy, with linked trades per cycle.
          </p>
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
        ) : (
          cycles
            .slice()
            .sort(
              (a, b) =>
                new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
                new Date(a.updated_at ?? a.created_at ?? 0).getTime()
            )
            .map((cycle) => {
              const linkedTrades = tradesByCycle[cycle.id] ?? [];
              const totalPremium = linkedTrades.reduce(
                (sum, trade) => sum + trade.premium * trade.contracts * 100,
                0
              );
              const openCount = linkedTrades.filter((trade) => trade.status === "OPEN").length;
              const expanded = openCycleIds[cycle.id] ?? false;

              return (
                <div key={cycle.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
    </main>
  );
}
