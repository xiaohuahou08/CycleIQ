"use client";

import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";

export default function CyclesPage() {
  const { mode } = useDataMode();
  const { data, loading, error } = useTerminalData(mode);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Trading</div>
          <h1 className="text-xl font-semibold">Cycles</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
            Plan next step (bulk)
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search ticker / cycle id"
            className="h-9 w-full max-w-md rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
          />
          <button className="h-9 px-3 rounded-lg border border-border bg-[color:var(--panel-2)] text-sm">
            Filters
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--muted)]">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-3 py-2">Ticker</th>
                <th className="text-left font-medium px-3 py-2">State</th>
                <th className="text-left font-medium px-3 py-2">Current leg</th>
                <th className="text-right font-medium px-3 py-2">Premium</th>
                <th className="text-right font-medium px-3 py-2">Stock PnL</th>
                <th className="text-right font-medium px-3 py-2">Total PnL</th>
                <th className="text-right font-medium px-3 py-2">Rolls</th>
                <th className="text-left font-medium px-3 py-2">Updated</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyMessage message="Loading…" />
              ) : error ? (
                <EmptyMessage message={`Error: ${error}`} />
              ) : data && data.cycles.length ? (
                data.cycles.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-3 font-medium">{c.ticker}</td>
                    <td className="px-3 py-3">
                      <StateChip state={c.state} />
                    </td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {c.currentLeg ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      ${c.premium.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <PnL value={c.stockPnl} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <PnL value={c.totalPnl} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.rollCount}
                    </td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {new Date(c.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs">
                        Plan
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyMessage message="No cycles yet. Seed demo data in Settings." />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-6 text-[color:var(--muted)]" colSpan={9}>
        {message}
      </td>
    </tr>
  );
}

function PnL({ value }: { value: number }) {
  const color =
    value > 0
      ? "text-[color:var(--positive)]"
      : value < 0
      ? "text-[color:var(--negative)]"
      : "text-[color:var(--muted)]";
  return <span className={color}>${value.toFixed(0)}</span>;
}

function StateChip({ state }: { state: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-[color:var(--panel-2)] px-2 py-1 text-xs">
      {state}
    </span>
  );
}

