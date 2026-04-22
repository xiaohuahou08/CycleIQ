"use client";

import { useMemo, useState } from "react";
import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { cancelExecutions, retryExecutions } from "@/lib/terminal/supabase-actions";

export default function ExecutionsPage() {
  const { mode } = useDataMode();
  const { data, loading, error, refresh } = useTerminalData(mode);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<
    | null
    | { kind: "bulkCancel" | "bulkRetry"; ids: string[] }
    | { kind: "filters" }
    | { kind: "view"; id: string }
  >(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const execs = data?.executions ?? [];
    const q = search.trim().toLowerCase();
    return execs.filter((x) => {
      if (statusFilter !== "all" && x.status !== statusFilter) return false;
      if (!q) return true;
      return (
        x.clientOrderId.toLowerCase().includes(q) ||
        (x.externalOrderId ?? "").toLowerCase().includes(q) ||
        x.id.toLowerCase().includes(q)
      );
    });
  }, [data?.executions, search, statusFilter]);

  const selectedIds = useMemo(
    () => visible.filter((x) => selected[x.id]).map((x) => x.id),
    [visible, selected]
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((x) => selected[x.id]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const x of data?.executions ?? []) set.add(x.status);
    return ["all", ...Array.from(set)];
  }, [data?.executions]);

  async function callMemory(endpoint: string, body: unknown) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(json?.error ?? `HTTP ${res.status}`);
    }
  }

  async function runCancel(ids: string[]) {
    if (!ids.length) return;
    if (mode === "memory") {
      await callMemory("/api/dev/executions/cancel", { executionIds: ids });
    } else {
      await cancelExecutions(ids);
    }
    await refresh();
  }

  async function runRetry(ids: string[]) {
    if (!ids.length) return;
    if (mode === "memory") {
      await callMemory("/api/dev/executions/retry", {
        executionIds: ids,
        seedLabel: "retry",
      });
    } else {
      await retryExecutions(ids, "retry");
    }
    await refresh();
  }

  function closeModal() {
    setModal(null);
    setModalError(null);
  }

  async function onConfirm() {
    if (!modal) return;
    setBusy(true);
    setModalError(null);
    try {
      if (modal.kind === "bulkCancel") await runCancel(modal.ids);
      if (modal.kind === "bulkRetry") await runRetry(modal.ids);
      closeModal();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Trading</div>
          <h1 className="text-xl font-semibold">Executions</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            type="button"
            disabled={!selectedIds.length || loading}
            onClick={() => setModal({ kind: "bulkCancel", ids: selectedIds })}
          >
            Bulk cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            type="button"
            disabled={!selectedIds.length || loading}
            onClick={() => setModal({ kind: "bulkRetry", ids: selectedIds })}
          >
            Bulk retry
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search client id / external id / execution id"
            className="h-9 w-full max-w-md rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="h-9 px-3 rounded-lg border border-border bg-[color:var(--panel-2)] text-sm"
            type="button"
            onClick={() => setModal({ kind: "filters" })}
          >
            Filters
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--muted)]">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => {
                      const next = { ...selected };
                      for (const x of visible) next[x.id] = e.target.checked;
                      setSelected(next);
                    }}
                    aria-label="Select all"
                  />
                </th>
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
              ) : visible.length ? (
                visible.map((x) => (
                  <tr key={x.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[x.id])}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [x.id]: e.target.checked }))
                        }
                        aria-label={`Select execution ${x.id}`}
                      />
                    </td>
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
                      <button
                        className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs"
                        type="button"
                        onClick={() => setModal({ kind: "view", id: x.id })}
                      >
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

      <ConfirmModal
        open={modal !== null}
        title={
          modal?.kind === "bulkCancel"
            ? "Cancel executions"
            : modal?.kind === "bulkRetry"
            ? "Retry executions"
            : modal?.kind === "filters"
            ? "Filters"
            : "Execution details"
        }
        description={
          modal?.kind === "bulkCancel"
            ? `This will cancel ${modal.ids.length} execution(s).`
            : modal?.kind === "bulkRetry"
            ? `This will create ${modal.ids.length} retry execution(s).`
            : modal?.kind === "filters"
            ? "Filter executions in the table."
            : "Read-only details."
        }
        confirmLabel={
          modal?.kind === "bulkCancel"
            ? "Cancel"
            : modal?.kind === "bulkRetry"
            ? "Retry"
            : "Close"
        }
        confirmVariant={modal?.kind === "bulkCancel" ? "danger" : "primary"}
        onConfirm={
          modal?.kind === "bulkCancel" || modal?.kind === "bulkRetry"
            ? () => void onConfirm()
            : undefined
        }
        onClose={closeModal}
        busy={busy}
        error={modalError}
      >
        {modal?.kind === "filters" ? (
          <div className="space-y-2">
            <div className="text-xs text-[color:var(--muted)]">OMS status</div>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    statusFilter === s
                      ? "border-border bg-[color:var(--panel-2)]"
                      : "border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  }`}
                  onClick={() => setStatusFilter(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : modal?.kind === "view" ? (
          <div className="text-sm text-[color:var(--muted)]">
            {(() => {
              const x = (data?.executions ?? []).find((e) => e.id === modal.id);
              if (!x) return "Execution not found.";
              return (
                <div className="space-y-1">
                  <div>
                    <span className="text-[color:var(--muted)]">id:</span>{" "}
                    <span className="font-mono text-xs">{x.id}</span>
                  </div>
                  <div>
                    <span className="text-[color:var(--muted)]">status:</span>{" "}
                    {x.status}
                  </div>
                  <div>
                    <span className="text-[color:var(--muted)]">client:</span>{" "}
                    <span className="font-mono text-xs">{x.clientOrderId}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-sm text-[color:var(--muted)]">
            Selected:{" "}
            {modal && "ids" in modal ? modal.ids.length : selectedIds.length}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-6 text-[color:var(--muted)]" colSpan={10}>
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

