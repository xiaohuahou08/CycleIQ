"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTrade,
  deleteTrade,
  expireTrade,
  listTrades,
  postCycleTransition,
  updateTrade,
  type CreateTradeInput,
  type Trade,
  type TradeStatus,
  type UpdateTradeInput,
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import AddTradeModal from "../dashboard/components/AddTradeModal";
import AssignTradeModal from "./components/AssignTradeModal";
import ExpireTradeModal from "./components/ExpireTradeModal";
import RollTradeModal from "./components/RollTradeModal";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getClosedCycleIds(trades: Trade[]): Set<string> {
  const cycleTrades = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    if (!t.cycle_id) return acc;
    if (!acc[t.cycle_id]) acc[t.cycle_id] = [];
    acc[t.cycle_id].push(t);
    return acc;
  }, {});

  return new Set(
    Object.entries(cycleTrades)
      .filter(([, ts]) => {
        const hasCalledAway = ts.some(
          (t) =>
            (t.option_type === "CALL" || t.option_type === "PUT") &&
            t.status === "CALLED_AWAY"
        );
        const hasOpen = ts.some((t) => t.status === "OPEN");
        return hasCalledAway || !hasOpen;
      })
      .map(([cycleId]) => cycleId)
  );
}

function applyFilters(trades: Trade[], f: FilterState, closedCycleIds: Set<string>): Trade[] {
  return trades.filter((t) => {
    if (f.type !== "ALL" && t.option_type !== f.type) return false;
    
    if (f.status !== "ALL" && t.status !== f.status) return false;

    // Date range stacks with status (e.g. Open + last month)
    const tDate = t.trade_date;
    if (f.dateRangeType === "1M") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 10);
      if (tDate < oneMonthAgoStr) return false;
    } else if (f.dateRangeType === "CUSTOM") {
      if (f.startDate && tDate < f.startDate) return false;
      if (f.endDate && tDate > f.endDate) return false;
    }

    if (
      f.search &&
      !t.ticker.toLowerCase().includes(f.search.toLowerCase()) &&
      !(t.notes ?? "").toLowerCase().includes(f.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

export default function TradesPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [expiringTrade, setExpiringTrade] = useState<Trade | null>(null);
  const [assigningTrade, setAssigningTrade] = useState<Trade | null>(null);
  const [rollingTrade, setRollingTrade] = useState<Trade | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: "PUT",
    status: "ALL",
    search: "",
    dateRangeType: "1M",
  });

  useEffect(() => {
    if (!token) return;
    listTrades(token)
      .then((trades) => setAllTrades(trades))
      .catch(() => setAllTrades([]))
      .finally(() => setTradesLoading(false));
  }, [token]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timeout = window.setTimeout(() => setSaveSuccess(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [saveSuccess]);

  const tickerSuggestions = useMemo(
    () =>
      Array.from(new Set(allTrades.map((trade) => trade.ticker)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [allTrades]
  );

  const closedCycleIds = useMemo(() => getClosedCycleIds(allTrades), [allTrades]);

  // Tickers that have an assigned (stock-held) position, i.e. CSP that was assigned.
  // Exclude wheels that are already closed (no OPEN legs), including called-away wheels.
  const assignedTickers = useMemo(() => {
    return Array.from(
      new Set(
        allTrades
          .filter(
            (t) =>
              t.option_type === "PUT" &&
              t.status === "ASSIGNED" &&
              (!t.cycle_id || !closedCycleIds.has(t.cycle_id))
          )
          .map((t) => t.ticker)
      )
    );
  }, [allTrades, closedCycleIds]);

  // Map ticker → cycle_id for ASSIGNED PUT trades (most recent per ticker).
  // Used to explicitly link new CC trades to the correct existing wheel.
  const assignedCycleByTicker = useMemo(() => {
    const map: Record<string, string> = {};
    allTrades
      .filter(
        (t) =>
          t.option_type === "PUT" &&
          t.status === "ASSIGNED" &&
          t.cycle_id &&
          !closedCycleIds.has(t.cycle_id)
      )
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())
      .forEach((t) => {
        if (t.cycle_id) map[t.ticker] = t.cycle_id;
      });
    return map;
  }, [allTrades, closedCycleIds]);

  // Fetch live prices for all unique tickers whenever the trade list changes.
  useEffect(() => {
    if (tickerSuggestions.length === 0) return;
    const symbols = tickerSuggestions.join(",");
    fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}`)
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        setPrices(data);
        setPricesUpdatedAt(new Date());
      })
      .catch(() => {/* silently ignore — Price column just shows — */});
  }, [tickerSuggestions]);

  const onSaveTrade = async (input: CreateTradeInput) => {
    if (!token) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const created = await createTrade(token, input);
      setModalOpen(false);
      setTradesLoading(true);
      const trades = await listTrades(token);
      setAllTrades(trades);
      // Match list filters to the new trade so it is visible (default view is PUT + OPEN).
      setFilters((prev) => ({
        ...prev,
        type: created.option_type,
        status: created.status === "OPEN" ? "OPEN" : prev.status,
      }));
      setSaveSuccess("Trade saved successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save trade.");
    } finally {
      setTradesLoading(false);
    }
  };

  const onSaveEditedTrade = async (input: CreateTradeInput) => {
    if (!token || !editingTrade) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await updateTrade(token, editingTrade.id, input);
      const trades = await listTrades(token);
      setAllTrades(trades);
      setModalOpen(false);
      setEditingTrade(null);
      setSaveSuccess("Trade updated successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update trade.");
    }
  };

  const onDeleteTrade = async (id: string) => {
    if (!token) return;
    setAllTrades((prev) => prev.filter((t) => t.id !== id));
    await deleteTrade(token, id);
  };

  const onEditTrade = (trade: Trade) => {
    setSaveError(null);
    setEditingTrade(trade);
    setModalOpen(true);
  };

  const onAction = async (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => {
    if (!token) return;
    try {
      if (action === "buy_to_close") {
        const updated = await updateTrade(token, trade.id, {
          status: "CLOSED",
          closed_at: todayIso(),
        });
        setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
        setSaveSuccess("Trade closed successfully.");
        return;
      }

      if (action === "expire") {
        setExpiringTrade(trade);
        return;
      }

      if (action === "assign") {
        setAssigningTrade(trade);
        return;
      }

      if (action === "roll") {
        setRollingTrade(trade);
        return;
      }

      const updated = await updateTrade(token, trade.id, { status: "CLOSED" as TradeStatus });
      setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
      setSaveSuccess("Trade updated successfully.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to apply trade action."
      );
    }
  };

  const filtered = applyFilters(allTrades, filters, closedCycleIds);

  if (isAuthLoading) return null;
  return (
    <>
      <main className="h-full bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
        <div className="w-full">
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
            {saveSuccess}
          </div>
        )}

        <div className="mt-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <TradeFilters
            embedded
            onFilterChange={setFilters}
            totalCount={allTrades.length}
            filteredCount={filtered.length}
            tickerSuggestions={tickerSuggestions}
            onAddTrade={() => {
              setSaveError(null);
              setSaveSuccess(null);
              setEditingTrade(null);
              setModalOpen(true);
            }}
          />
          <div className="border-t border-slate-100">
            <TradeList
              trades={filtered}
              loading={tradesLoading}
              onAddTrade={() => {
                setSaveError(null);
                setSaveSuccess(null);
                setEditingTrade(null);
                setModalOpen(true);
              }}
              prices={prices}
              onDeleteTrade={onDeleteTrade}
              onEditTrade={onEditTrade}
              onAction={onAction}
              hideAddButton={filters.status === "CALLED_AWAY" || filters.status === "CLOSED"}
              statusFilter={filters.status}
            />
          </div>
        </div>

        {pricesUpdatedAt && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-teal-100 bg-teal-50 px-4 py-2 text-[12px] text-teal-700">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Prices update once per hour. Last updated at{" "}
            {pricesUpdatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.
          </div>
        )}
        </div>
      </main>

      <AddTradeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTrade(null);
        }}
        onSave={editingTrade ? onSaveEditedTrade : onSaveTrade}
        tickerSuggestions={tickerSuggestions}
        assignedTickers={assignedTickers}
        assignedCycleByTicker={editingTrade ? undefined : assignedCycleByTicker}
        initialValues={
          editingTrade
            ? {
                ticker: editingTrade.ticker,
                option_type: editingTrade.option_type,
                strike: editingTrade.strike,
                expiry: editingTrade.expiry,
                trade_date: editingTrade.trade_date,
                premium: editingTrade.premium,
                commission_fee: editingTrade.commission_fee ?? undefined,
                contracts: editingTrade.contracts,
                delta: editingTrade.delta,
                status: editingTrade.status,
                notes: editingTrade.notes,
              }
            : undefined
        }
        title={editingTrade ? "Edit Trade" : "Add Trade"}
        submitLabel={editingTrade ? "Update Trade" : "Save Trade"}
      />

      <AssignTradeModal
        open={Boolean(assigningTrade)}
        trade={assigningTrade}
        onClose={() => setAssigningTrade(null)}
        onConfirm={async (input) => {
          if (!token || !assigningTrade) return;
          setSaveError(null);
          try {
            if (assigningTrade.cycle_id) {
              await postCycleTransition(token, assigningTrade.cycle_id, {
                event: "assigned",
                params: {
                  shares: assigningTrade.contracts * 100,
                  assignment_price: input.assignment_price,
                },
              });
            }
            const terminalStatus =
              assigningTrade.option_type === "CALL" ? "CALLED_AWAY" : "ASSIGNED";
            const updated = await updateTrade(token, assigningTrade.id, {
              status: terminalStatus,
              strike: input.assignment_price,
              ...(assigningTrade.option_type === "CALL"
                ? { called_away_at: input.trade_date }
                : { assigned_at: input.trade_date }),
              ...(input.fees_on_assignment !== undefined
                ? { fees_on_assignment: input.fees_on_assignment }
                : {}),
              ...(input.prior_roll_premium_per_share !== undefined
                ? { prior_roll_premium_per_share: input.prior_roll_premium_per_share }
                : {}),
              ...(input.notes?.trim()
                ? {
                    notes: [assigningTrade.notes?.trim(), input.notes.trim()]
                      .filter(Boolean)
                      .join("\n"),
                  }
                : {}),
            });
            setAllTrades((prev) =>
              prev.map((t) => (t.id === assigningTrade.id ? updated : t))
            );
            setAssigningTrade(null);
            setSaveSuccess(
              assigningTrade.option_type === "CALL"
                ? "Position marked called away successfully."
                : "Trade assigned successfully."
            );
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to assign trade.");
            throw err;
          }
        }}
      />

      <RollTradeModal
        open={Boolean(rollingTrade)}
        trade={rollingTrade}
        onClose={() => setRollingTrade(null)}
        onConfirm={async (input) => {
          if (!token || !rollingTrade) return;
          setSaveError(null);
          try {
            const netPremiumPerShare = input.new_premium_per_share - input.buyback_cost_per_share;

            if (rollingTrade.cycle_id) {
              await postCycleTransition(token, rollingTrade.cycle_id, {
                event: "roll",
                params: {
                  new_strike: input.new_strike,
                  new_expiry: input.new_expiry,
                  net_premium: netPremiumPerShare,
                },
              });
            }

            const mergedNotes = input.notes?.trim()
              ? [rollingTrade.notes?.trim(), input.notes.trim()].filter(Boolean).join("\n")
              : undefined;

            // Step 1: mark original trade ROLLED — store buyback cost so net roll cashflow
            // (original_premium − buyback) is correctly applied to P&L and cost-basis reduction.
            const rolledOriginal = await updateTrade(token, rollingTrade.id, {
              status: "ROLLED",
              rolled_at: input.trade_date,
              buyback_cost_per_share: input.buyback_cost_per_share,
              ...(mergedNotes ? { notes: mergedNotes } : {}),
            } as UpdateTradeInput);

            // Step 2: create new OPEN trade for the new leg, linked via rolled_from_id.
            // If the original had a cycle, pass it so the new leg joins the same cycle.
            // If no cycle, omit cycle_id so the backend auto-creates one for the new leg.
            const newLeg = await createTrade(token, {
              ticker: rollingTrade.ticker,
              option_type: rollingTrade.option_type as "PUT" | "CALL",
              strike: input.new_strike,
              expiry: input.new_expiry,
              trade_date: input.trade_date,
              premium: input.new_premium_per_share,
              contracts: rollingTrade.contracts,
              status: "OPEN",
              ...(input.fees != null && Number.isFinite(input.fees) && input.fees > 0 ? { commission_fee: input.fees } : {}),
              rolled_from_id: rollingTrade.id,
              ...(rollingTrade.cycle_id ? { cycle_id: rollingTrade.cycle_id } : {}),
            } as CreateTradeInput);

            // If the original had no cycle and the new leg got one, back-fill the ROLLED trade
            // so both legs share the same cycle and appear together on the cycles page.
            let finalRolled = rolledOriginal;
            if (!rollingTrade.cycle_id && newLeg.cycle_id) {
              try {
                finalRolled = await updateTrade(token, rolledOriginal.id, {
                  cycle_id: newLeg.cycle_id,
                } as UpdateTradeInput);
              } catch {
                // non-fatal: cycles page may not show both legs together, but data is intact
              }
            }

            setAllTrades((prev) => [
              ...prev.map((t) => (t.id === rollingTrade.id ? finalRolled : t)),
              newLeg,
            ]);
            setRollingTrade(null);
            setSaveSuccess("Trade rolled successfully. New leg added as OPEN position.");
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to roll trade.");
            throw err;
          }
        }}
      />

      <ExpireTradeModal
        open={Boolean(expiringTrade)}
        trade={expiringTrade}
        onClose={() => setExpiringTrade(null)}
        onConfirm={async (input) => {
          if (!token || !expiringTrade) return;
          setSaveError(null);
          try {
            const updated = await expireTrade(token, expiringTrade.id, {
              expired_at: input.expired_at,
              expire_type: input.expire_type,
            });
            const mergedNotes = input.notes
              ? [updated.notes?.trim(), input.notes.trim()].filter(Boolean).join("\n")
              : undefined;
            const needFollowupUpdate =
              mergedNotes !== undefined || input.commission_fee !== undefined;

            if (needFollowupUpdate) {
              const notesUpdated = await updateTrade(token, updated.id, {
                notes: mergedNotes,
                commission_fee: input.commission_fee,
              });
              setAllTrades((prev) =>
                prev.map((t) => (t.id === notesUpdated.id ? notesUpdated : t))
              );
            } else {
              setAllTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            }

            setExpiringTrade(null);
            setSaveSuccess("Trade expired successfully.");
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to expire trade.");
            throw err;
          }
        }}
      />
    </>
  );
}
