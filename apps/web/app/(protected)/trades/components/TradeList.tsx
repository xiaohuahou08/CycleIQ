"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Trade, TradeStatus } from "@/lib/api/trades";

interface TradeRowProps {
  trade: Trade;
  price?: number;
  onDelete: () => void;
  onEdit: () => void;
  onAction: (action: "buy_to_close" | "expire" | "assign" | "roll") => void;
  rowTint?: boolean;
  onRowClick: () => void;
}

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  prices: Record<string, number>;
  onAddTrade: () => void;
  onDeleteTrade: (id: string) => void;
  onEditTrade: (trade: Trade) => void;
  onAction: (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => void;
  onRowClick: (trade: Trade) => void;
}

const STATUS_STYLES: Record<TradeStatus, string> = {
  OPEN: "bg-amber-50 text-amber-800 ring-amber-100",
  CLOSED: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  EXPIRED: "bg-gray-100 text-gray-600 ring-gray-100",
  ASSIGNED: "bg-orange-50 text-orange-800 ring-orange-100",
  CALLED_AWAY: "bg-red-50 text-red-800 ring-red-100",
  ROLLED: "bg-blue-50 text-blue-800 ring-blue-100",
};

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(
      ticker
    )}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function parseDateLike(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  }
  return new Date(input);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parseDateLike(iso));
}

function getStrategy(t: Trade): string {
  return t.option_type === "PUT" ? "CSP" : "CC";
}

function getDte(expiry: string): number {
  const diffMs = parseDateLike(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function fmtExpirationRibbon(iso: string): { label: string; accent: boolean } {
  const d = parseDateLike(iso);
  const mon = new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  const day = d.getDate();
  return { label: `${mon} - ${day}`, accent: getDte(iso) <= 7 };
}

function holdingDays(trade: Trade): number {
  // For closed/expired/assigned trades: actual days held (open → end date).
  const endIso =
    trade.closed_at ??
    trade.expired_at ??
    trade.assigned_at ??
    trade.called_away_at ??
    trade.rolled_at ??
    null;

  if (endIso) {
    const open = parseDateLike(trade.trade_date).getTime();
    const close = parseDateLike(endIso).getTime();
    return Math.max(1, Math.round((close - open) / (1000 * 60 * 60 * 24)));
  }

  // Still OPEN: use full planned duration (trade_date → expiry).
  // This keeps the annualized ROI stable — it won't inflate as DTE shrinks.
  const open = parseDateLike(trade.trade_date).getTime();
  const expiry = parseDateLike(trade.expiry).getTime();
  return Math.max(1, Math.round((expiry - open) / (1000 * 60 * 60 * 24)));
}

function annualizedRoiPct(trade: Trade): number | null {
  const days = holdingDays(trade);
  const gross = trade.premium * trade.contracts * 100;
  const fee = trade.commission_fee ?? 0;
  const net = gross - fee;

  // Capital at risk:
  // • CSP (PUT)  → full strike notional (cash-secured)
  // • CC  (CALL) → stock cost basis per share when available, else strike
  const pricePerShare =
    trade.option_type === "CALL" && trade.stock_cost_basis_per_share != null
      ? trade.stock_cost_basis_per_share
      : trade.strike;

  const capital = pricePerShare * trade.contracts * 100;
  if (capital <= 0) return null;

  return (net / capital) * (365 / days) * 100;
}

function fmtRoi(trade: Trade): string {
  const r = annualizedRoiPct(trade);
  if (r == null || !Number.isFinite(r)) return "—";
  const sign = r < 0 ? "−" : "";
  return `${sign}${Math.abs(r).toFixed(1)}%`;
}

function fmtPremiumTotal(trade: Trade): string {
  const v = trade.premium * trade.contracts * 100;
  return `+$${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtStockCostPerShare(trade: Trade): string {
  if (
    trade.status === "ASSIGNED" &&
    trade.option_type === "PUT" &&
    trade.stock_cost_basis_per_share != null &&
    Number.isFinite(trade.stock_cost_basis_per_share)
  ) {
    return `$${trade.stock_cost_basis_per_share.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  return "—";
}

function computeMoneyness(
  trade: Trade,
  price: number
): { label: string; itm: boolean } {
  const diff = price - trade.strike; // positive = price above strike
  const itm =
    trade.option_type === "PUT"
      ? diff < 0 // PUT: ITM when price < strike
      : diff > 0; // CALL: ITM when price > strike
  const amount = Math.abs(diff);
  return {
    label: `${itm ? "ITM" : "OTM"} $${amount.toFixed(2)}`,
    itm,
  };
}

function isExpiredEligible(trade: Trade): boolean {
  if (trade.status !== "OPEN") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseDateLike(trade.expiry);
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
  return toLocalDateKey(startOfWeekMonday(parseDateLike(expiry)));
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
  return `Week of ${fmt(monday).toUpperCase()} – ${fmt(friday, true).toUpperCase()}`;
}

type SortKey =
  | "ticker"
  | "strike"
  | "contracts"
  | "premium"
  | "expiry"
  | "dte"
  | "roi";

function cmpNum(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareTrades(a: Trade, b: Trade, key: SortKey, dir: number): number {
  const roiA = annualizedRoiPct(a);
  const roiB = annualizedRoiPct(b);
  switch (key) {
    case "ticker":
      return dir * a.ticker.localeCompare(b.ticker);
    case "strike":
      return dir * cmpNum(a.strike, b.strike);
    case "contracts":
      return dir * cmpNum(a.contracts, b.contracts);
    case "premium":
      return dir * cmpNum(a.premium * a.contracts, b.premium * b.contracts);
    case "expiry":
      return (
        dir *
        cmpNum(
          parseDateLike(a.expiry).getTime(),
          parseDateLike(b.expiry).getTime()
        )
      );
    case "dte":
      return dir * cmpNum(getDte(a.expiry), getDte(b.expiry));
    case "roi": {
      const va = roiA ?? -Infinity;
      const vb = roiB ?? -Infinity;
      return dir * cmpNum(va, vb);
    }
    default:
      return 0;
  }
}

function SortChevrons({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  const upActive = active && dir === "asc";
  const dnActive = active && dir === "desc";
  return (
    <span className="ml-1 inline-flex h-4 shrink-0 flex-col items-center justify-center gap-[1px] align-middle leading-none">
      <svg
        viewBox="0 0 12 12"
        fill={upActive ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={upActive ? 0 : 1.8}
        className={`h-2 w-2 transition-colors ${
          upActive ? "text-blue-500" : "text-gray-300"
        }`}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 8 3-5 3 5" />
      </svg>
      <svg
        viewBox="0 0 12 12"
        fill={dnActive ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={dnActive ? 0 : 1.8}
        className={`h-2 w-2 transition-colors ${
          dnActive ? "text-blue-500" : "text-gray-300"
        }`}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 4-3 5-3-5" />
      </svg>
    </span>
  );
}

function TickerLogo({ ticker }: { ticker: string }) {
  const [urlIndex, setUrlIndex] = useState(0);

  if (urlIndex >= LOGO_URL_BUILDERS.length) {
    return (
      <span className="inline-flex h-[20px] w-[20px] items-center justify-center rounded bg-[#e8f4ff] text-[10px] font-bold text-[#1d4ed8]">
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={LOGO_URL_BUILDERS[urlIndex](ticker)}
      alt=""
      className="h-[20px] w-[20px] rounded object-cover ring-1 ring-gray-100"
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

function TradeRow({
  trade,
  price,
  onDelete,
  onEdit,
  onAction,
  rowTint,
  onRowClick,
}: TradeRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
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

  const exp = fmtExpirationRibbon(trade.expiry);
  const COLS = 12;

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-gray-100 text-[13px] text-gray-900 transition hover:bg-[#fafbfc]/90 ${
          rowTint ? "bg-[rgba(254,237,229,0.45)] hover:bg-[rgba(254,237,229,0.55)]" : ""
        }`}
        onClick={onRowClick}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <TickerLogo key={trade.ticker} ticker={trade.ticker} />
            <span className="text-[13px] font-semibold uppercase tracking-wide">
              {trade.ticker}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex rounded-md bg-[#eef0f4] px-2 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-100/80">
            {getStrategy(trade)}
          </span>
        </td>
        <td className="px-4 py-3 tabular-nums text-gray-800">{trade.contracts}</td>
        <td className="px-4 py-3 tabular-nums text-gray-800">
          ${trade.strike.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3 tabular-nums text-gray-800">
          {price != null
            ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-[12px]">
          {price != null ? (() => {
            const m = computeMoneyness(trade, price);
            return (
              <span className={m.itm ? "font-medium text-red-500" : "text-gray-500"}>
                {m.label}
              </span>
            );
          })() : <span className="text-gray-300">—</span>}
        </td>
        <td
          className={`px-4 py-3 text-[13px] font-medium ${
            exp.accent ? "text-[#ea580c]" : "text-gray-800"
          }`}
        >
          {exp.label}
        </td>
        <td className="px-4 py-3 tabular-nums text-gray-700">{getDte(trade.expiry)}</td>
        <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-[#16a34a]">
          {fmtPremiumTotal(trade)}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[trade.status]}`}
          >
            {trade.status.replaceAll("_", " ")}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums tracking-tight text-gray-900">
          {fmtRoi(trade)}
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
            className="rounded px-2 py-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Actions"
          >
            <span className="text-[16px] leading-none tracking-tighter">⋯</span>
          </button>
          {menuOpen && menuPos && (
            <div
              ref={menuRef}
              className="fixed z-[100] w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left text-[13px] shadow-xl"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("buy_to_close");
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
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
                  className="block w-full px-3 py-2 text-left hover:bg-gray-50"
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
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("roll");
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Roll
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

    </>
  );
}

const theadBtn =
  "inline-flex cursor-pointer items-center gap-1 select-none text-left uppercase tracking-[0.08em] text-[#6b7280] hover:text-[#4b5563]";

export default function TradeList({
  trades,
  loading,
  prices,
  onAddTrade,
  onDeleteTrade,
  onEditTrade,
  onAction,
  onRowClick,
}: TradeListProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "expiry",
    dir: "asc",
  });

  const groups = useMemo(() => {
    const acc: Record<string, Trade[]> = {};
    const sortedFlat = [...trades].sort((a, b) =>
      compareTrades(a, b, sort.key, sort.dir === "asc" ? 1 : -1)
    );
    for (const t of sortedFlat) {
      const k = getWeekKey(t.expiry);
      if (!acc[k]) acc[k] = [];
      acc[k].push(t);
    }
    return acc;
  }, [trades, sort]);

  const sortedWeekKeys = Object.keys(groups).sort(
    (a, b) => parseLocalDateKey(a).getTime() - parseLocalDateKey(b).getTime()
  );

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const th = (
    key: SortKey,
    align: "left" | "right",
    label: ReactNode
  ) => (
    <th
      className={`border-b border-gray-200 bg-[#fafbfc] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button type="button" className={`${theadBtn} ${align === "right" ? "ml-auto" : ""}`} onClick={() => toggleSort(key)}>
        {label}
        <SortChevrons active={sort.key === key} dir={sort.dir} />
      </button>
    </th>
  );

  const thInactive = (
    align: "left" | "right",
    label: ReactNode
  ) => (
    <th
      className={`border-b border-gray-200 bg-[#fafbfc] px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6b7280] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-8">
        <div className="h-8 w-full max-w-xl animate-pulse rounded bg-gray-100" />
        <div className="h-[180px] w-full animate-pulse rounded-none bg-[#fafbfc]" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-[15px] font-semibold text-gray-900">No positions yet</p>
        <p className="mt-1 max-w-md text-[13px] text-gray-500">
          Add a trade to populate this view — same layout as the reference dashboard.
        </p>
        <button
          type="button"
          onClick={onAddTrade}
          className="mt-5 rounded-lg border border-gray-200 bg-gray-900 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-gray-800"
        >
          + Add trade
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {th("ticker", "left", "Ticker")}
            {thInactive("left", "Strategy")}
            {th("contracts", "left", "Qty")}
            {th("strike", "left", "Strike")}
            {thInactive("left", "Price")}
            {thInactive("left", "Moneyness")}
            {th("expiry", "left", "Expiration")}
            {th("dte", "left", "DTE")}
            {th("premium", "left", "Premium")}
            {thInactive("left", "Status")}
            {th("roi", "right", "Roi (ANN.)")}
            {thInactive("right", "")}
          </tr>
        </thead>
        {sortedWeekKeys.map((weekKey, wi) => {
          const list = groups[weekKey];
          const rowTint = wi % 2 === 1;
          return (
            <tbody key={weekKey}>
              <tr className="bg-[#f3f4f6]/90">
                <td
                  colSpan={12}
                  className="border-l-[3px] border-l-[#3b82f6] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#374151]"
                >
                  {formatWeekLabel(weekKey)}
                </td>
              </tr>
              {list.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  price={prices[trade.ticker]}
                  rowTint={rowTint}
                  onDelete={() => onDeleteTrade(trade.id)}
                  onEdit={() => onEditTrade(trade)}
                  onAction={(action) => onAction(trade, action)}
                  onRowClick={() => onRowClick(trade)}
                />
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
