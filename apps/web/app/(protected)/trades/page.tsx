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
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import AddTradeModal from "../dashboard/components/AddTradeModal";
import AssignTradeModal from "./components/AssignTradeModal";
import ExpireTradeModal from "./components/ExpireTradeModal";
import RollTradeModal from "./components/RollTradeModal";
import TradeDetailModal from "./components/TradeDetailModal";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function applyFilters(trades: Trade[], f: FilterState): Trade[] {
  return trades.filter((t) => {
    if (f.type !== "ALL" && t.option_type !== f.type) return false;
    if (f.status !== "ALL" && t.status !== f.status) return false;
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
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: "PUT",
    status: "OPEN",
    search: "",
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
      await createTrade(token, input);
      setModalOpen(false);
      setTradesLoading(true);
      const trades = await listTrades(token);
      setAllTrades(trades);
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

  const filtered = applyFilters(allTrades, filters);

  if (isAuthLoading) return null;
  return (
    <>
      <main className="flex-1 bg-[#f4f6f8] px-4 py-6 sm:px-6 lg:px-8">
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
            {saveSuccess}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
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
          <div className="border-t border-gray-100">
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
              onRowClick={(trade) => setDetailTrade(trade)}
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
      </main>

      <TradeDetailModal
        trade={detailTrade}
        allTrades={allTrades}
        onClose={() => setDetailTrade(null)}
        onEdit={(t) => {
          setDetailTrade(null);
          onEditTrade(t);
        }}
        onAction={(t, action) => {
          setDetailTrade(null);
          void onAction(t, action);
        }}
        onDelete={(id) => {
          setDetailTrade(null);
          void onDeleteTrade(id);
        }}
      />

      <AddTradeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTrade(null);
        }}
        onSave={editingTrade ? onSaveEditedTrade : onSaveTrade}
        tickerSuggestions={tickerSuggestions}
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

            const updated = await updateTrade(token, rollingTrade.id, {
              status: "ROLLED",
              strike: input.new_strike,
              expiry: input.new_expiry,
              premium: netPremiumPerShare,
              rolled_at: input.trade_date,
              ...(Number.isFinite(input.fees) ? { commission_fee: input.fees } : {}),
              ...(mergedNotes ? { notes: mergedNotes } : {}),
            });
            setAllTrades((prev) => prev.map((t) => (t.id === rollingTrade.id ? updated : t)));
            setRollingTrade(null);
            setSaveSuccess("Trade rolled successfully.");
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
