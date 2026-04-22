"use client";

import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";

export default function OrdersPage() {
  const { mode } = useDataMode();
  const { data, loading, error } = useTerminalData(mode);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Trading</div>
          <h1 className="text-xl font-semibold">Orders (intents)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
            Bulk approve
          </button>
          <button className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
            Bulk execute (dry-run)
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search ticker / intent id / cycle id"
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
                <th className="text-left font-medium px-3 py-2">Created</th>
                <th className="text-left font-medium px-3 py-2">Ticker</th>
                <th className="text-left font-medium px-3 py-2">Type</th>
                <th className="text-left font-medium px-3 py-2">Legs</th>
                <th className="text-right font-medium px-3 py-2">Est. premium</th>
                <th className="text-left font-medium px-3 py-2">Risk</th>
                <th className="text-left font-medium px-3 py-2">Approval</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyMessage message="Loading…" />
              ) : error ? (
                <EmptyMessage message={`Error: ${error}`} />
              ) : data && data.intents.length ? (
                data.intents.map((o) => (
                  <tr key={o.id} className="border-b border-border">
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-medium">{o.ticker}</td>
                    <td className="px-3 py-3">{o.type}</td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">
                      {o.legs}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      ${o.estimatedPremium.toFixed(2)}
                    </td>
                    <td className="px-3 py-3">
                      <RiskChip status={o.riskStatus} />
                    </td>
                    <td className="px-3 py-3">
                      <ApprovalChip status={o.approvalStatus} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs">
                        {o.approvalStatus === "approved"
                          ? "Execute"
                          : o.approvalStatus === "pending"
                          ? "Approve"
                          : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyMessage message="No order intents yet. Seed demo data in Settings." />
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
      <td className="px-3 py-6 text-[color:var(--muted)]" colSpan={8}>
        {message}
      </td>
    </tr>
  );
}

function RiskChip({ status }: { status: string }) {
  const color =
    status === "pass"
      ? "text-[color:var(--positive)]"
      : status === "fail"
      ? "text-[color:var(--negative)]"
      : "text-[color:var(--warning)]";
  return (
    <span className={`inline-flex items-center rounded-md border border-border bg-[color:var(--panel-2)] px-2 py-1 text-xs ${color}`}>
      {status}
    </span>
  );
}

function ApprovalChip({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-[color:var(--panel-2)] px-2 py-1 text-xs text-[color:var(--muted)]">
      {status}
    </span>
  );
}

