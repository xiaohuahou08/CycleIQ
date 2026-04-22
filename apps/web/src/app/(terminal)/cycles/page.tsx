"use client";

import { useMemo, useState } from "react";
import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  advanceWheel,
  createWheelCycle,
  planCycles,
} from "@/lib/terminal/supabase-actions";
import type { CycleState } from "@/lib/demo/types";
import type { WheelAdvanceAction, WheelStrategyParams } from "@/lib/terminal/wheel-engine";

export default function CyclesPage() {
  const { mode } = useDataMode();
  const { data, loading, error, refresh } = useTerminalData(mode);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<
    | null
    | { kind: "plan"; ids: string[] }
    | { kind: "filters" }
    | { kind: "create" }
    | { kind: "event"; cycleId: string }
  >(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createTicker, setCreateTicker] = useState("");
  const [createState, setCreateState] = useState<CycleState>("CSP_OPEN");
  const [seed, setSeed] = useState("default");
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [strategy, setStrategy] = useState<WheelStrategyParams>({
    contracts: 1,
    targetDte: 30,
    targetDelta: 0.25,
    rollDaysBefore: 7,
    takeProfitPct: 0.5,
  });
  const [advanceAction, setAdvanceAction] = useState<WheelAdvanceAction>("assigned");
  const [advanceDays, setAdvanceDays] = useState<number>(0);

  const visible = useMemo(() => {
    const cycles = data?.cycles ?? [];
    const q = search.trim().toLowerCase();
    return cycles.filter((c) => {
      if (stateFilter !== "all" && c.state !== stateFilter) return false;
      if (!q) return true;
      return c.ticker.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    });
  }, [data?.cycles, search, stateFilter]);

  const selectedIds = useMemo(
    () => visible.filter((c) => selected[c.id]).map((c) => c.id),
    [visible, selected]
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected[c.id]);

  const states = useMemo(() => {
    const set = new Set<string>();
    for (const c of data?.cycles ?? []) set.add(c.state);
    return ["all", ...Array.from(set)];
  }, [data?.cycles]);

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

  async function runPlan(ids: string[]) {
    if (!ids.length) return;
    if (mode === "memory") {
      await callMemory("/api/dev/cycles/plan", { cycleIds: ids, seedLabel: "plan" });
    } else {
      await planCycles(ids, "plan");
    }
    await refresh();
  }

  async function runCreateCycle() {
    const ticker = createTicker.trim().toUpperCase();
    if (!ticker) throw new Error("Ticker is required.");

    if (mode === "memory") {
      await callMemory("/api/dev/wheel/create", {
        ticker,
        seed,
        asOfDate,
        strategy,
      });
    } else {
      await createWheelCycle({
        ticker,
        seed,
        asOfDateYmd: asOfDate,
        strategy,
      });
    }
    await refresh();
  }

  async function runAdvance(cycleId: string) {
    if (mode === "memory") {
      await callMemory("/api/dev/wheel/advance", {
        cycleId,
        action: advanceAction,
        days: advanceDays,
      });
    } else {
      await advanceWheel({ cycleId, action: advanceAction, days: advanceDays });
    }
    await refresh();
  }

  function closeModal() {
    setModal(null);
    setModalError(null);
  }

  async function onConfirm() {
    setBusy(true);
    setModalError(null);
    try {
      if (!modal) return;
      if (modal.kind === "plan") await runPlan(modal.ids);
      if (modal.kind === "create") await runCreateCycle();
      if (modal.kind === "event") await runAdvance(modal.cycleId);
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
          <h1 className="text-xl font-semibold">Cycles</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
            type="button"
            onClick={() => setModal({ kind: "create" })}
          >
            Create cycle
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            type="button"
            disabled={!selectedIds.length || loading}
            onClick={() => setModal({ kind: "plan", ids: selectedIds })}
          >
            Plan next step (bulk)
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <input
            placeholder="Search ticker / cycle id"
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
                      for (const c of visible) next[c.id] = e.target.checked;
                      setSelected(next);
                    }}
                    aria-label="Select all"
                  />
                </th>
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
              ) : visible.length ? (
                visible.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[c.id])}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [c.id]: e.target.checked }))
                        }
                        aria-label={`Select ${c.ticker}`}
                      />
                    </td>
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
                      <button
                        className="px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-xs"
                        type="button"
                        onClick={() => setModal({ kind: "plan", ids: [c.id] })}
                      >
                        Plan
                      </button>
                      <button
                        className="ml-2 px-2 py-1 rounded-md border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
                        type="button"
                        onClick={() => setModal({ kind: "event", cycleId: c.id })}
                      >
                        Simulate
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

      <ConfirmModal
        open={modal !== null}
        title={
          modal?.kind === "filters"
            ? "Filters"
            : modal?.kind === "create"
            ? "Create cycle"
            : modal?.kind === "event"
            ? "Simulate lifecycle event"
            : "Plan next step"
        }
        description={
          modal?.kind === "filters"
            ? "Filter cycles in the table."
            : modal?.kind === "create"
            ? "Create a new wheel/cycle (and optionally create the first SELL_CSP intent)."
            : modal?.kind === "event"
            ? "Advance the wheel (Expire OTM / Assigned / Call away). This will also create the next recommended intent as draft."
            : `This will create ${modal?.kind === "plan" ? modal.ids.length : 0} new intent(s) as drafts.`
        }
        confirmLabel={
          modal?.kind === "filters"
            ? "Close"
            : modal?.kind === "create"
            ? "Create"
            : modal?.kind === "event"
            ? "Apply"
            : "Plan"
        }
        onConfirm={
          modal?.kind === "filters" ? undefined : () => void onConfirm()
        }
        onClose={closeModal}
        busy={busy}
        error={modalError}
      >
        {modal?.kind === "filters" ? (
          <div className="space-y-2">
            <div className="text-xs text-[color:var(--muted)]">Cycle state</div>
            <div className="flex flex-wrap gap-2">
              {states.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    stateFilter === s
                      ? "border-border bg-[color:var(--panel-2)]"
                      : "border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  }`}
                  onClick={() => setStateFilter(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : modal?.kind === "create" ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Ticker</div>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                value={createTicker}
                onChange={(e) => setCreateTicker(e.target.value)}
                placeholder="AAPL"
              />
            </div>
            <div>
              <div className="text-xs text-[color:var(--muted)]">Starting state</div>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                value={createState}
                onChange={(e) => setCreateState(e.target.value as CycleState)}
              >
                {(["CSP_OPEN", "STOCK_HELD", "CC_OPEN", "EXIT", "IDLE"] as CycleState[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-[color:var(--muted)]">Seed</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="default"
                />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)]">As-of date</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-[color:var(--muted)]">Contracts</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={String(strategy.contracts)}
                  onChange={(e) =>
                    setStrategy((s) => ({ ...s, contracts: Number(e.target.value || 1) }))
                  }
                />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)]">Target DTE</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={String(strategy.targetDte)}
                  onChange={(e) =>
                    setStrategy((s) => ({ ...s, targetDte: Number(e.target.value || 30) }))
                  }
                />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)]">Target delta</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={String(strategy.targetDelta)}
                  onChange={(e) =>
                    setStrategy((s) => ({ ...s, targetDelta: Number(e.target.value || 0.25) }))
                  }
                />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)]">Roll days before</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={String(strategy.rollDaysBefore)}
                  onChange={(e) =>
                    setStrategy((s) => ({ ...s, rollDaysBefore: Number(e.target.value || 7) }))
                  }
                />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)]">Take profit pct</div>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                  value={String(strategy.takeProfitPct)}
                  onChange={(e) =>
                    setStrategy((s) => ({ ...s, takeProfitPct: Number(e.target.value || 0.5) }))
                  }
                />
              </div>
            </div>
          </div>
        ) : modal?.kind === "event" ? (
          <div className="space-y-2">
            <div className="text-xs text-[color:var(--muted)]">Advance action</div>
            <select
              className="h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
              value={advanceAction}
              onChange={(e) => setAdvanceAction(e.target.value as WheelAdvanceAction)}
            >
              <option value="expire_otm">Expire OTM</option>
              <option value="assigned">Assigned</option>
              <option value="call_away">Call away</option>
            </select>
            <div>
              <div className="mt-2 text-xs text-[color:var(--muted)]">Advance days (optional)</div>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
                value={String(advanceDays)}
                onChange={(e) => setAdvanceDays(Number(e.target.value || 0))}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-[color:var(--muted)]">
            Selected: {modal?.kind === "plan" ? modal.ids.length : 0}
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

