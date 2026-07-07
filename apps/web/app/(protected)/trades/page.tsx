"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { fetchPlanUsage, type PlanUsage } from "@/lib/api/plan";
import { useProtectedAuth } from "../auth-context";
import AddTradeModal from "../dashboard/components/AddTradeModal";
import AssignTradeModal from "./components/AssignTradeModal";
import ExpireTradeModal from "./components/ExpireTradeModal";
import RollTradeModal from "./components/RollTradeModal";
import { Clock } from "lucide-react";
import { iconXs, iconStroke } from "@/app/components/icons";
import PageHeader from "@/app/components/PageHeader";
import RefreshingSpinner from "@/app/components/RefreshingSpinner";
import { useToast } from "@/app/components/Toast";
import { applyFilters, getClosedCycleIds } from "@/lib/trades/filters";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TradesPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const { showToast } = useToast();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [expiringTrade, setExpiringTrade] = useState<Trade | null>(null);
  const [assigningTrade, setAssigningTrade] = useState<Trade | null>(null);
  const [rollingTrade, setRollingTrade] = useState<Trade | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: "PUT",
    status: "OPEN",
    search: "",
    dateRangeType: "1M",
  });

  const reloadTrades = useCallback(async () => {
    if (!token) return;
    setTradesLoading(true);
    try {
      const trades = await listTrades(token);
      setAllTrades(trades);
    } catch {
      setAllTrades([]);
    } finally {
      setTradesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadTrades();
  }, [token, reloadTrades]);

  const refreshPlanUsage = async () => {
    if (!token) return;
    try {
      const usage = await fetchPlanUsage(token);
      setPlanUsage(usage);
    } catch {
      setPlanUsage(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPlanUsage();
  }, [token]);

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
    try {
      const created = await createTrade(token, input);
      setModalOpen(false);
      await reloadTrades();
      // Match list filters to the new trade so it is visible (default view is PUT + OPEN).
      setFilters((prev) => ({
        ...prev,
        type: created.option_type,
        status: created.status === "OPEN" ? "OPEN" : prev.status,
      }));
      showToast("Trade saved successfully.", "success");
      await refreshPlanUsage();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save trade.", "error");
    }
  };

  const onSaveEditedTrade = async (input: CreateTradeInput) => {
    if (!token || !editingTrade) return;
    try {
      await updateTrade(token, editingTrade.id, input);
      await reloadTrades();
      setModalOpen(false);
      setEditingTrade(null);
      showToast("Trade updated successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update trade.", "error");
    }
  };

  const onDeleteTrade = async (id: string) => {
    if (!token) return;
    // Optimistic removal; restore the prior list if the request fails.
    const previous = allTrades;
    setAllTrades((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTrade(token, id);
      await refreshPlanUsage();
    } catch (err) {
      setAllTrades(previous);
      showToast(err instanceof Error ? err.message : "Failed to delete trade.", "error");
    }
  };

  const onEditTrade = (trade: Trade) => {
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
        showToast("Trade closed successfully.", "success");
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
      showToast("Trade updated successfully.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to apply trade action.",
        "error"
      );
    }
  };

  const filtered = applyFilters(allTrades, filters, closedCycleIds);

  const tradesUsageLabel = planUsage
    ? planUsage.trades_limit != null
      ? `${planUsage.trades_this_month}/${planUsage.trades_limit} trades this month · Basic`
      : `${planUsage.trades_this_month} trades this month · Premium`
    : undefined;

  const addTradeDisabled = Boolean(planUsage?.limit_reached);
  const addTradeDisabledReason =
    "Monthly trade limit reached (Basic plan: 20/month). Upgrade to Premium or wait until next month.";

  if (isAuthLoading) return null;
  return (
    <>
      <main className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-hidden">
        {planUsage?.limit_reached && (
          <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-5 py-2.5 text-sm text-amber-900">
            You&apos;ve used all {planUsage.trades_limit} trades for this month on the Basic
            plan.{" "}
            <Link href="/pricing" className="font-medium underline underline-offset-2 hover:text-amber-950">
              View pricing
            </Link>{" "}
            or wait until the next calendar month.
          </div>
        )}

        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pt-4 sm:px-6">
          <PageHeader
            title="Trades"
            description="Manage CSP and covered call positions"
          />
        </div>

        {tradesLoading ? (
          <div className="min-h-0 flex-1 overflow-hidden bg-white">
            <RefreshingSpinner className="flex min-h-full w-full items-center justify-center" />
          </div>
        ) : (
          <>
            <TradeFilters
              embedded
              filters={filters}
              onFilterChange={setFilters}
              tickerSuggestions={tickerSuggestions}
              tradesUsageLabel={tradesUsageLabel}
              addTradeDisabled={addTradeDisabled}
              addTradeDisabledReason={addTradeDisabledReason}
              onAddTrade={() => {
                if (addTradeDisabled) return;
                setEditingTrade(null);
                setModalOpen(true);
              }}
            />

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white">
              <TradeList
                trades={filtered}
                prices={prices}
                onDeleteTrade={onDeleteTrade}
                onEditTrade={onEditTrade}
                onAction={onAction}
                statusFilter={filters.status}
                onAddTrade={
                  addTradeDisabled
                    ? undefined
                    : () => {
                        setEditingTrade(null);
                        setModalOpen(true);
                      }
                }
              />
            </div>

            {pricesUpdatedAt && (
              <div className="flex shrink-0 items-center gap-1.5 border-t border-slate-200 bg-white px-5 py-2 text-xs font-medium text-slate-600">
                <Clock className={iconXs} strokeWidth={iconStroke} aria-hidden />
                Prices update once per hour. Last updated at{" "}
                {pricesUpdatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.
              </div>
            )}
          </>
        )}
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
                status: editingTrade.status,
                notes: editingTrade.notes,
              }
            : undefined
        }
        title={editingTrade ? "Edit Trade" : "Add Trade"}
        submitLabel={editingTrade ? "Update Trade" : "Save Trade"}
        existingTrades={allTrades}
        editingTradeId={editingTrade?.id}
      />

      <AssignTradeModal
        open={Boolean(assigningTrade)}
        trade={assigningTrade}
        onClose={() => setAssigningTrade(null)}
        onConfirm={async (input) => {
          if (!token || !assigningTrade) return;
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
            showToast(
              assigningTrade.option_type === "CALL"
                ? "Position marked called away successfully."
                : "Trade assigned successfully.",
              "success"
            );
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to assign trade.", "error");
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
            showToast("Trade rolled successfully. New leg added as OPEN position.", "success");
            await refreshPlanUsage();
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to roll trade.", "error");
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
            showToast("Trade expired successfully.", "success");
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to expire trade.", "error");
            throw err;
          }
        }}
      />
    </>
  );
}
