"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  createTrade,
  deleteTrade,
  listTrades,
  type CreateTradeInput,
  type Trade,
} from "@/lib/api/trades";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";
import AddTradeModal from "../dashboard/components/AddTradeModal";

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
    )
      return false;
    return true;
  });
}

export default function TradesPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

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
    const loadToken = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
        }
      } catch {
        // Auth handled in layout
      }
    };
    void loadToken();
  }, [router]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const filtered = applyFilters(allTrades, filters);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => { setSaveError(null); setModalOpen(true); }}
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
          onAddTrade={() => { setSaveError(null); setModalOpen(true); }}
          onDeleteTrade={onDeleteTrade}
        />
      </div>

      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
      />
    </>
  );
}
