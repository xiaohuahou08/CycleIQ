"use client";

import { useState } from "react";
import type { Trade, TradeStatus } from "@/lib/api/trades";

interface TradeGroupProps {
  ticker: string;
  trades: Trade[];
  onDeleteTrade: (id: string) => void;
  onEditTrade: (trade: Trade) => void;
  onAction: (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => void;
}

const STATUS_STYLES: Record<TradeStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CLOSED: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-500",
  ASSIGNED: "bg-orange-100 text-orange-800",
  CALLED_AWAY: "bg-red-100 text-red-800",
  ROLLED: "bg-blue-100 text-blue-800",
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function getStrategy(t: Trade): string {
  return t.option_type === "PUT" ? "CSP" : "CC";
}

function getTypeColor(t: Trade): string {
  return t.option_type === "PUT" ? "text-blue-700" : "text-purple-700";
}

function getDte(expiry: string): number {
  const diffMs = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function TradeRow({
  trade,
  onDelete,
  onEdit,
  onAction,
}: {
  trade: Trade;
  onDelete: () => void;
  onEdit: () => void;
  onAction: (action: "buy_to_close" | "expire" | "assign" | "roll") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <tr
        className="group cursor-pointer border-b border-gray-50 hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold ${getTypeColor(trade)}`}>
            {getStrategy(trade)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          ${trade.strike.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {fmtDate(trade.expiry)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {getDte(trade.expiry)}d
        </td>
        <td className="px-4 py-3 text-sm font-medium text-green-700">
          +${(trade.premium * trade.contracts * 100).toFixed(0)}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[trade.status]}`}
          >
            {trade.status}
          </span>
        </td>
        <td className="relative px-4 py-3 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
            title="Actions"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              className="absolute right-8 z-10 mt-1 w-36 overflow-hidden rounded-md border border-gray-200 bg-white text-left text-sm shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("buy_to_close");
                }}
                className="block w-full px-3 py-2 hover:bg-gray-50"
              >
                Buy to Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("expire");
                }}
                className="block w-full px-3 py-2 hover:bg-gray-50"
              >
                Expire
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("assign");
                }}
                className="block w-full px-3 py-2 hover:bg-gray-50"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("roll");
                }}
                className="block w-full px-3 py-2 hover:bg-gray-50"
              >
                Roll
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={7} className="px-4 py-3 text-sm text-gray-600">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-gray-400">Contracts</span>
                <p className="font-medium">{trade.contracts}</p>
              </div>
              {trade.delta !== undefined && (
                <div>
                  <span className="text-xs text-gray-400">Delta</span>
                  <p className="font-medium">{trade.delta.toFixed(2)}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400">Trade Date</span>
                <p className="font-medium">{fmtDate(trade.trade_date)}</p>
              </div>
            </div>
            {trade.notes && (
              <div className="mt-2">
                <span className="text-xs text-gray-400">Notes</span>
                <p className="mt-0.5 text-gray-700">{trade.notes}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function TradeGroup({
  ticker,
  trades,
  onDeleteTrade,
  onEditTrade,
  onAction,
}: TradeGroupProps) {
  const [open, setOpen] = useState(true);
  const totalPremium = trades.reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);
  const openCount = trades.filter((t) => t.status === "OPEN").length;

  return (
    <div className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{open ? "▼" : "▶"}</span>
          <span className="text-sm font-semibold text-gray-900">{ticker}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {trades.length} trade{trades.length !== 1 ? "s" : ""}
          </span>
          {openCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {openCount} open
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-green-700">
            +${totalPremium.toFixed(0)} total
          </span>
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Strategy</th>
                <th className="px-4 py-2">Strike</th>
                <th className="px-4 py-2">Expiry</th>
                <th className="px-4 py-2">DTE</th>
                <th className="px-4 py-2">Premium</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onDelete={() => onDeleteTrade(trade.id)}
                  onEdit={() => onEditTrade(trade)}
                  onAction={(action) => onAction(trade, action)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  onAddTrade: () => void;
  onDeleteTrade: (id: string) => void;
  onEditTrade: (trade: Trade) => void;
  onAction: (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => void;
}

export default function TradeList({
  trades,
  loading,
  onAddTrade,
  onDeleteTrade,
  onEditTrade,
  onAction,
}: TradeListProps) {
  const groups = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    if (!acc[t.ticker]) acc[t.ticker] = [];
    acc[t.ticker].push(t);
    return acc;
  }, {});

  const sortedTickers = Object.keys(groups).sort(
    (a, b) => groups[b].length - groups[a].length
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
        <div className="text-5xl">📋</div>
        <p className="mt-4 text-base font-medium text-gray-900">No trades yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Add your first trade to start tracking your wheel strategy.
        </p>
        <button
          type="button"
          onClick={onAddTrade}
          className="mt-5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedTickers.map((ticker) => (
        <TradeGroup
          key={ticker}
          ticker={ticker}
          trades={groups[ticker]}
          onDeleteTrade={onDeleteTrade}
          onEditTrade={onEditTrade}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
