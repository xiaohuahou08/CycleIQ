"use client";

import { useEffect, useState } from "react";
import {
  createTrade,
  deleteTrade,
  listTrades,
  postCycleTransition,
  updateTrade,
  type CreateTradeInput,
  type Trade,
  type TradeStatus,
} from "@/lib/api/trades";
import { useProtectedAuth } from "../auth-context";
import AddTradeModal from "../dashboard/components/AddTradeModal";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";

function applyFilters(trades: Trade[], f: FilterState): Trade[] {
  return trades.filter((t) => {
    if (f.ticker && t.ticker !== f.ticker) return false;
    if (f.type !== "ALL" && t.option_type !== f.type) return false;
    if (f.status !== "ALL" && t.status !== f.status) return false;
    if (f.dateFrom && t.trade_date < f.dateFrom) return false;
    if (f.dateTo && t.trade_date > f.dateTo) return false;
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    ticker: "",
    type: "ALL",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  useEffect(() => {
    if (!token) return;
    setTradesLoading(true);
    listTrades(token)
      .then((trades) => setAllTrades(trades))
      .catch(() => setAllTrades([]))
      .finally(() => setTradesLoading(false));
  }, [token]);

  const onSaveTrade = async (input: CreateTradeInput) => {
    if (!token) return;
    setSaveError(null);
    try {
      await createTrade(token, input);
      setModalOpen(false);
      setTradesLoading(true);
      const trades = await listTrades(token);
      setAllTrades(trades);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save trade.");
    } finally {
      setTradesLoading(false);
    }
  };

  const onDeleteTrade = async (id: string) => {
    if (!token) return;
    setAllTrades((prev) => prev.filter((t) => t.id !== id));
    await deleteTrade(token, id);
  };

  const onEditTrade = async (trade: Trade) => {
    if (!token) return;
    const notes = window.prompt("Edit notes", trade.notes ?? "");
    if (notes === null) return;
    try {
      const updated = await updateTrade(token, trade.id, { notes });
      setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update trade.");
    }
  };

  const onAction = async (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => {
    if (!token) return;
    try {
      if (action === "buy_to_close") {
        const updated = await updateTrade(token, trade.id, { status: "CLOSED" });
        setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
        return;
      }

      if (action === "expire") {
        if (trade.cycle_id) {
          await postCycleTransition(token, trade.cycle_id, { event: "expire_otm" });
        }
        const updated = await updateTrade(token, trade.id, { status: "EXPIRED" });
        setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
        return;
      }

      if (action === "assign") {
        if (trade.cycle_id) {
          await postCycleTransition(token, trade.cycle_id, {
            event: "assigned",
            params: { shares: trade.contracts * 100 },
          });
        }
        const updated = await updateTrade(token, trade.id, { status: "ASSIGNED" });
        setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
        return;
      }

      if (action === "roll") {
        const defaultExpiry = trade.expiry;
        const defaultStrike = trade.strike.toString();
        const defaultPremium = trade.premium.toString();
        const strikeInput = window.prompt("New strike", defaultStrike);
        if (strikeInput === null) return;
        const expiryInput = window.prompt("New expiry (YYYY-MM-DD)", defaultExpiry);
        if (expiryInput === null) return;
        const premiumInput = window.prompt("Net premium", defaultPremium);
        if (premiumInput === null) return;

        const newStrike = Number(strikeInput);
        const netPremium = Number(premiumInput);
        if (!Number.isFinite(newStrike) || !Number.isFinite(netPremium)) {
          setSaveError("Invalid roll params.");
          return;
        }

        if (trade.cycle_id) {
          await postCycleTransition(token, trade.cycle_id, {
            event: "roll",
            params: {
              new_strike: newStrike,
              new_expiry: expiryInput,
              net_premium: netPremium,
            },
          });
        }
        const updated = await updateTrade(token, trade.id, {
          status: "ROLLED",
          strike: newStrike,
          expiry: expiryInput,
          premium: netPremium,
        });
        setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
        return;
      }

      const updated = await updateTrade(token, trade.id, { status: "CLOSED" as TradeStatus });
      setAllTrades((prev) => prev.map((t) => (t.id === trade.id ? updated : t)));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to apply trade action."
      );
    }
  };

  if (isAuthLoading) return null;

  const filtered = applyFilters(allTrades, filters);
  return (
    <>
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Trades</h1>
            <p className="mt-1 text-sm text-gray-500">All your wheel strategy trades</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveError(null);
              setModalOpen(true);
            }}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Add Trade
          </button>
        </div>

        {saveError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="mt-6">
          <TradeFilters
            onFilterChange={setFilters}
            totalCount={allTrades.length}
            filteredCount={filtered.length}
          />
        </div>

        <div className="mt-4">
          <TradeList
            trades={filtered}
            loading={tradesLoading}
            onAddTrade={() => {
              setSaveError(null);
              setModalOpen(true);
            }}
            onDeleteTrade={onDeleteTrade}
            onEditTrade={onEditTrade}
            onAction={onAction}
          />
        </div>
      </main>

      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
      />
    </>
  );
}
