"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTrade,
  deleteTrade,
  listTrades,
  type CreateTradeInput,
  type Trade,
} from "@/lib/api/trades";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSupabaseClient } from "@/lib/supabase/client";
import TradeFilters, { type FilterState } from "./components/TradeFilters";
import TradeList from "./components/TradeList";
import AddTradeModal from "@/app/dashboard/components/AddTradeModal";

// ─── Filter logic ───────────────────────────────────────────────────────────

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

// ─── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar({
  email,
  mobileOpen,
  onClose,
}: {
  email: string | null;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const nav = [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "Cycles", href: "/cycles", icon: "🔄" },
    { label: "Trades", href: "/trades", icon: "📋", active: true },
    { label: "Reports", href: "/reports", icon: "📊" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-gray-200 bg-white lg:static">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-5">
          <span className="text-xl">⚙️</span>
          <span className="text-base font-semibold text-gray-900">CycleIQ</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4">
          <p className="truncate text-xs text-gray-400">{email ?? "—"}</p>
          <p className="mt-2 text-[10px] text-gray-400">Account menu is top-right</p>
        </div>
      </aside>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ticker: "",
    type: "ALL",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login"); return; }
        setEmail(session.user.email ?? "");
        setToken(session.access_token);
      } catch {
        router.replace("/login");
      } finally {
        setIsAuthLoading(false);
      }
    };
    void loadUser();
  }, [router]);

  // ── Load trades ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading state before async fetch is intentional
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

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        email={email}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 lg:text-base">Trades</p>
              <p className="hidden truncate text-xs text-gray-500 sm:block">All your wheel strategy trades</p>
            </div>
          </div>
          <UserMenu email={email} />
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
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

          {/* Filters */}
          <div className="mt-6">
            <TradeFilters
              onFilterChange={setFilters}
              totalCount={allTrades.length}
              filteredCount={filtered.length}
            />
          </div>

          {/* Trade list */}
          <div className="mt-4">
            <TradeList
              trades={filtered}
              loading={tradesLoading}
              onAddTrade={() => { setSaveError(null); setModalOpen(true); }}
              onDeleteTrade={onDeleteTrade}
            />
          </div>
        </main>
      </div>

      {/* Add Trade modal */}
      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTrade}
      />
    </div>
  );
}
