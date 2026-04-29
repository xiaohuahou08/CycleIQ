"use client";

import { useEffect, useRef, useState } from "react";
import type { Trade, TradeStatus } from "@/lib/api/trades";

interface TradeGroupProps {
  weekLabel: string;
  positionCount: number;
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

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(
      ticker
    )}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

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

function isExpiredEligible(trade: Trade): boolean {
  if (trade.status !== "OPEN") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(trade.expiry);
  expiry.setHours(0, 0, 0, 0);
  return expiry <= today;
}

function startOfWeekMonday(input: Date): Date {
  const d = new Date(input);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function getWeekKey(expiry: string): string {
  return toLocalDateKey(startOfWeekMonday(new Date(expiry)));
}

function formatWeekLabel(weekKey: string): string {
  const monday = parseLocalDateKey(weekKey);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (date: Date, withYear = false) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(date);
  return `WEEK OF ${fmt(monday).toUpperCase()} - ${fmt(friday, true).toUpperCase()}`;
}

function TickerLogo({ ticker }: { ticker: string }) {
  const [urlIndex, setUrlIndex] = useState(0);

  useEffect(() => {
    setUrlIndex(0);
  }, [ticker]);

  if (urlIndex >= LOGO_URL_BUILDERS.length) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-semibold text-blue-700">
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={LOGO_URL_BUILDERS[urlIndex](ticker)}
      alt={`${ticker} logo`}
      className="h-5 w-5 rounded object-cover"
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleViewportChange = () => {
      setMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [menuOpen]);

  return (
    <>
      <tr
        className="group cursor-pointer border-b border-gray-50 hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <div className="flex items-center gap-2">
            <TickerLogo ticker={trade.ticker} />
            <span>{trade.ticker}</span>
          </div>
        </td>
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
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpen) {
                setMenuOpen(false);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({
                top: rect.bottom + 6,
                left: rect.right - 144,
              });
              setMenuOpen(true);
            }}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
            title="Actions"
          >
            ⋯
          </button>
          {menuOpen && menuPos && (
            <div
              ref={menuRef}
              className="fixed z-[100] w-36 overflow-hidden rounded-md border border-gray-200 bg-white text-left text-sm shadow-xl transition-shadow duration-150 hover:shadow-[0_20px_45px_-12px_rgba(15,23,42,0.45)]"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 transition-shadow duration-150 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("buy_to_close");
                }}
                className="block w-full px-3 py-2 transition-shadow duration-150 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
              >
                Buy to Close
              </button>
              {isExpiredEligible(trade) && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("expire");
                  }}
                  className="block w-full px-3 py-2 transition-shadow duration-150 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
                >
                  Expire
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("assign");
                }}
                className="block w-full px-3 py-2 transition-shadow duration-150 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("roll");
                }}
                className="block w-full px-3 py-2 transition-shadow duration-150 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]"
              >
                Roll
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-red-600 transition-shadow duration-150 hover:bg-red-50 hover:shadow-[inset_0_0_0_1px_rgba(220,38,38,0.24)]"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={8} className="px-4 py-3 text-sm text-gray-600">
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
  weekLabel,
  positionCount,
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
          <span className="text-sm font-semibold text-gray-900">{weekLabel}</span>
          {openCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {openCount} open
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            {positionCount} position{positionCount !== 1 ? "s" : ""}
          </span>
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
                <th className="px-4 py-2 text-left">Ticker</th>
                <th className="px-4 py-2 text-left">Strategy</th>
                <th className="px-4 py-2 text-left">Strike</th>
                <th className="px-4 py-2 text-left">Expiry</th>
                <th className="px-4 py-2 text-left">DTE</th>
                <th className="px-4 py-2 text-left">Premium</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
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
    const weekKey = getWeekKey(t.expiry);
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(t);
    return acc;
  }, {});

  const sortedWeekKeys = Object.keys(groups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
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
      {sortedWeekKeys.map((weekKey) => (
        <TradeGroup
          key={weekKey}
          weekLabel={formatWeekLabel(weekKey)}
          positionCount={groups[weekKey].length}
          trades={groups[weekKey]}
          onDeleteTrade={onDeleteTrade}
          onEditTrade={onEditTrade}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
