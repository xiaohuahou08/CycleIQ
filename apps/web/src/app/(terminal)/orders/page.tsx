"use client";

import { useMemo, useState } from "react";
import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { approveIntents, executeAndSimulateFill } from "@/lib/terminal/supabase-actions";

export default function OrdersPage() {
  const { mode } = useDataMode();
  const { data, loading, error, refresh } = useTerminalData(mode);
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<
    "all" | "draft" | "pending" | "approved" | "rejected"
  >("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<
    | null
    | {
        kind:
          | "bulkApprove"
          | "bulkExecute"
          | "rowApprove"
          | "rowExecute"
          | "view";
        ids: string[];
      }
  >(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const intents = data?.intents ?? [];
    const q = search.trim().toLowerCase();
    return intents.filter((o) => {
      if (approvalFilter !== "all" && o.approvalStatus !== approvalFilter)
        return false;
      if (!q) return true;
      return (
        o.ticker.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.cycleId.toLowerCase().includes(q)
      );
    });
  }, [data?.intents, search, approvalFilter]);

  const selectedIds = useMemo(
    () => visible.filter((o) => selected[o.id]).map((o) => o.id),
    [visible, selected]
  );

  const allVisibleSelected =
    visible.length > 0 && visible.every((o) => selected[o.id]);

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

  async function runApprove(ids: string[]) {
    if (!ids.length) return;
    if (mode === "memory") {
      await callMemory("/api/dev/intents/approve", { intentIds: ids });
    } else {
      await approveIntents(ids);
    }
    await refresh();
  }

  async function runExecute(ids: string[]) {
    if (!ids.length) return;
    if (mode === "memory") {
      await callMemory("/api/dev/wheel/execute", { intentIds: ids });
    } else {
      await executeAndSimulateFill(ids);
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
      if (modal.kind === "bulkApprove" || modal.kind === "rowApprove") {
        await runApprove(modal.ids);
      } else if (modal.kind === "bulkExecute" || modal.kind === "rowExecute") {
        await runExecute(modal.ids);
      }
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
          <h1 className="text-xl font-semibold">Orders (intents)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            disabled={!selectedIds.length || loading}
            onClick={() => setModal({ kind: "bulkApprove", ids: selectedIds })}
            type="button"
          >
            Bulk approve
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            disabled={!selectedIds.length || loading}
            onClick={() => setModal({ kind: "bulkExecute", ids: selectedIds })}
            type="button"
          >
            Bulk execute (dry-run)
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search ticker / intent id / cycle id"
            className="h-9 w-full max-w-md rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="h-9 px-3 rounded-lg border border-border bg-[color:var(--panel-2)] text-sm"
            type="button"
            onClick={() =>
              setModal({
                kind: "view",
                ids: [],
              })
            }
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
                      for (const o of visible) next[o.id] = e.target.checked;
                      setSelected(next);
                    }}
                    aria-label="Select all"
                  />
                </th>
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
              ) : visible.length ? (
                visible.map((o) => (
                  <tr key={o.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[o.id])}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [o.id]: e.target.checked }))
                        }
                        aria-label={`Select ${o.ticker}`}
                      />
                    </td>
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
                      <button
                        className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs"
                        type="button"
                        onClick={() => {
                          if (o.approvalStatus === "approved") {
                            setModal({ kind: "rowExecute", ids: [o.id] });
                          } else if (
                            o.approvalStatus === "pending" ||
                            o.approvalStatus === "draft"
                          ) {
                            setModal({ kind: "rowApprove", ids: [o.id] });
                          } else {
                            setModal({ kind: "view", ids: [o.id] });
                          }
                        }}
                      >
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

      <ConfirmModal
        open={modal !== null}
        title={
          modal?.kind === "bulkApprove" || modal?.kind === "rowApprove"
            ? "Approve order intents"
            : modal?.kind === "bulkExecute" || modal?.kind === "rowExecute"
            ? "Execute (dry-run)"
            : "Filters / View"
        }
        description={
          modal?.kind === "bulkApprove" || modal?.kind === "rowApprove"
            ? `This will approve ${modal.ids.length} intent(s).`
            : modal?.kind === "bulkExecute" || modal?.kind === "rowExecute"
            ? `This will create executions for ${modal.ids.length} intent(s) (simulated).`
            : "Set filters for the list."
        }
        confirmLabel={
          modal?.kind === "bulkApprove" || modal?.kind === "rowApprove"
            ? "Approve"
            : modal?.kind === "bulkExecute" || modal?.kind === "rowExecute"
            ? "Execute"
            : "Close"
        }
        onConfirm={
          modal?.kind === "view" ? undefined : () => void onConfirm()
        }
        onClose={closeModal}
        busy={busy}
        error={modalError}
      >
        {modal?.kind === "view" ? (
          <div className="space-y-2">
            <div className="text-xs text-[color:var(--muted)]">
              Approval status
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "draft", "pending", "approved", "rejected"] as const).map(
                (v) => (
                  <button
                    key={v}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      approvalFilter === v
                        ? "border-border bg-[color:var(--panel-2)]"
                        : "border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                    }`}
                    onClick={() => setApprovalFilter(v)}
                    disabled={busy}
                  >
                    {v}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-[color:var(--muted)]">
            Selected: {modal?.ids.length ?? 0}
          </div>
        )}
      </ConfirmModal>
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

