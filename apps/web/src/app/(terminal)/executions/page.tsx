"use client";

import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";

export default function ExecutionsPage() {
  const { mode } = useDataMode();
  const { data, loading, error } = useTerminalData(mode);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Trading</div>
          <h1 className="text-xl font-semibold">Executions</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
            Bulk cancel
          </button>
          <button className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
            Bulk retry
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search client id / external id / execution id"
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
                <th className="text-left font-medium px-3 py-2">Started</th>
                <th className="text-left font-medium px-3 py-2">Ticker</th>
                <th className="text-left font-medium px-3 py-2">Intent</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Broker</th>
                <th className="text-left font-medium px-3 py-2">Client id</th>
                <th className="text-left font-medium px-3 py-2">External id</th>
                <th className="text-left font-medium px-3 py-2">Last update</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyMessage message="Loading…" />
              ) : error ? (
                <EmptyMessage message={`Error: ${error}`} />
              ) : data && data.executions.length ? (
                data.executions.map((x) => (
                  <tr key={x.id} className="border-b border-border">
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {new Date(x.startedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-medium">{x.ticker}</td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {x.intentId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip status={x.status} />
                    </td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {x.broker}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {x.clientOrderId}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[color:var(--muted)]">
                      {x.externalOrderId ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {new Date(x.lastUpdate).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyMessage message="No executions yet. Seed demo data in Settings." />
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

function StatusChip({ status }: { status: string }) {
  const color =
    status === "filled"
      ? "text-[color:var(--positive)]"
      : status === "failed"
      ? "text-[color:var(--negative)]"
      : status === "canceled"
      ? "text-[color:var(--muted)]"
      : "text-[color:var(--info)]";
  return (
    <span className={`inline-flex items-center rounded-md border border-border bg-[color:var(--panel-2)] px-2 py-1 text-xs ${color}`}>
      {status}
    </span>
  );
}

