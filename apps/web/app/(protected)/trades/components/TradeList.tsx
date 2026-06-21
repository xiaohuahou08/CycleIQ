"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import type { Trade, TradeStatus } from "@/lib/api/trades";

interface TradeRowProps {
  trade: Trade;
  price?: number;
  onDelete: () => void;
  onEdit: () => void;
  onAction: (action: "buy_to_close" | "expire" | "assign" | "roll") => void;
  rowTint?: boolean;
}

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  prices: Record<string, number>;
  onDeleteTrade: (id: string) => void;
  onEditTrade: (trade: Trade) => void;
  onAction: (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => void;
  statusFilter?: string;
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
): { status: "ITM" | "OTM"; amount: number } {
  const diff = price - trade.strike;
  const itm =
    trade.option_type === "PUT"
      ? diff < 0
      : diff > 0;
  return { status: itm ? "ITM" : "OTM", amount: Math.abs(diff) };
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
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(date);
  return `Week of ${fmt(monday)} – ${fmt(friday, true)}`;
}

function fmtStatusLabel(status: TradeStatus): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  if (!active) {
    return (
      <ChevronsUpDown
        className="ml-1 h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-400"
        strokeWidth={iconStroke}
        aria-hidden
      />
    );
  }

  if (dir === "asc") {
    return (
      <ChevronUp
        className="ml-1 h-3.5 w-3.5 text-emerald-600"
        strokeWidth={2.25}
        aria-hidden
      />
    );
  }

  return (
    <ChevronDown
      className="ml-1 h-3.5 w-3.5 text-emerald-600"
      strokeWidth={2.25}
      aria-hidden
    />
  );
}

function TickerLogo({ ticker }: { ticker: string }) {
  const [urlIndex, setUrlIndex] = useState(0);

  if (urlIndex >= LOGO_URL_BUILDERS.length) {
    return (
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md bg-emerald-50 text-[11px] font-semibold text-emerald-700">
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={LOGO_URL_BUILDERS[urlIndex](ticker)}
      alt=""
      className="h-[26px] w-[26px] rounded-md object-cover ring-1 ring-slate-200/80"
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
}: TradeRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [confirmRolledDelete, setConfirmRolledDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
      setConfirmRolledDelete(false);
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
  const COLS = 13;

  return (
    <>
      <tr
        className={`border-b border-slate-100 text-base text-slate-800 transition-colors hover:bg-slate-50/80 ${
          rowTint ? "bg-orange-50/35 hover:bg-orange-50/50" : "bg-white"
        }`}
      >
        <td className="whitespace-nowrap px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <TickerLogo key={trade.ticker} ticker={trade.ticker} />
            <span className="text-base font-semibold tracking-tight text-slate-900">
              {trade.ticker}
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap px-5 py-3.5">
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {getStrategy(trade)}
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-700">{trade.contracts}</td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-800">
          ${trade.strike.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-700">
          {price != null
            ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : <span className="text-slate-300">—</span>}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 text-sm">
          {trade.status === "OPEN" && price != null ? (() => {
            const m = computeMoneyness(trade, price);
            return (
              <span className="inline-flex items-center gap-1.5">
                <span className={`font-medium ${m.status === "ITM" ? "text-red-600" : "text-slate-400"}`}>
                  {m.status}
                </span>
                <span className="font-medium tabular-nums text-emerald-600">
                  ${m.amount.toFixed(2)}
                </span>
              </span>
            );
          })() : <span className="text-slate-300">—</span>}
        </td>
        <td
          className={`whitespace-nowrap px-5 py-3.5 tabular-nums text-base ${
            exp.accent ? "font-medium text-orange-600" : "text-slate-700"
          }`}
        >
          {exp.label}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">
          {trade.status === "OPEN" ? getDte(trade.expiry) : <span className="text-slate-300">—</span>}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-base font-medium text-emerald-600">
          {fmtPremiumTotal(trade)}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-base">
          {trade.status === "ASSIGNED" && trade.option_type === "PUT" && trade.stock_cost_basis_per_share != null ? (
            <span className="font-medium text-orange-700">
              {fmtStockCostPerShare(trade)}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-5 py-3.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[trade.status]}`}
          >
            {fmtStatusLabel(trade.status)}
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 text-right text-base font-semibold tabular-nums tracking-tight text-slate-900">
          {fmtRoi(trade)}
        </td>
        <td className="relative whitespace-nowrap px-5 py-3.5 text-right">
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpen) {
                setMenuOpen(false);
                setConfirmRolledDelete(false);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({
                top: rect.bottom + 6,
                left: rect.right - 144,
              });
              setMenuOpen(true);
            }}
            className="inline-flex rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Actions"
            aria-label="Trade actions"
          >
            <MoreHorizontal className={iconSm} strokeWidth={iconStroke} aria-hidden />
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
              {trade.status !== "ASSIGNED" &&
                trade.status !== "ROLLED" &&
                !(trade.option_type === "PUT" && trade.status === "EXPIRED") && (
                <>
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
                    {trade.option_type === "CALL" ? "Call Away" : "Assign"}
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
                </>
              )}
              {trade.status === "ROLLED" && !confirmRolledDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmRolledDelete(true)}
                  className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Delete…
                </button>
              )}
              {trade.status === "ROLLED" && confirmRolledDelete && (
                <div className="px-3 py-2">
                  <p className="mb-2 text-[11px] leading-snug text-gray-500">
                    This is a rolled trade. Deleting it will break the trade chain.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmRolledDelete(false);
                      onDelete();
                    }}
                    className="block w-full rounded bg-red-600 px-2 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-red-700"
                  >
                    Yes, delete anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRolledDelete(false)}
                    className="mt-1 block w-full rounded px-2 py-1.5 text-center text-[11px] text-gray-500 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {trade.status !== "ROLLED" && (
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
              )}
            </div>
          )}
        </td>
      </tr>

    </>
  );
}

const theadBtn =
  "group inline-flex cursor-pointer items-center gap-0.5 select-none text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-slate-900";

export default function TradeList({
  trades,
  loading,
  prices,
  onDeleteTrade,
  onEditTrade,
  onAction,
  statusFilter,
}: TradeListProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "expiry",
    dir: "asc",
  });

  useEffect(() => {
    if (!statusFilter) return;
    const isClosedOrPast = ["CLOSED", "EXPIRED", "ASSIGNED", "ROLLED"].includes(statusFilter);
    setSort({
      key: "expiry",
      dir: isClosedOrPast ? "desc" : "asc",
    });
  }, [statusFilter]);

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

  const sortedWeekKeys = useMemo(() => {
    const keys = Object.keys(groups);
    if (sort.key === "expiry" || sort.key === "dte") {
      const multiplier = sort.dir === "asc" ? 1 : -1;
      return keys.sort(
        (a, b) => multiplier * (parseLocalDateKey(a).getTime() - parseLocalDateKey(b).getTime())
      );
    }
    return keys.sort(
      (a, b) => parseLocalDateKey(a).getTime() - parseLocalDateKey(b).getTime()
    );
  }, [groups, sort.key, sort.dir]);

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
      className={`sticky top-0 z-10 border-b border-slate-300/80 bg-slate-100/95 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-700 backdrop-blur-sm ${
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
      className={`sticky top-0 z-10 border-b border-slate-300/80 bg-slate-100/95 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-700 backdrop-blur-sm ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );

  if (loading) {
    return (
      <div className="space-y-3 px-5 py-8">
        <div className="h-9 w-full max-w-md animate-pulse rounded-lg bg-slate-100" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-slate-50 ring-1 ring-slate-100" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
        <p className="text-base font-semibold text-slate-900">No trades match your filters</p>
        <p className="max-w-sm text-sm text-slate-500">
          Try a wider date range, a different status tab, or add a new trade.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-base">
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
            {thInactive("left", "Stock Cost")}
            {thInactive("left", "Status")}
            {th("roi", "right", "ROI (Ann.)")}
            {thInactive("right", "")}
          </tr>
        </thead>
        {sortedWeekKeys.map((weekKey, wi) => {
          const list = groups[weekKey];
          const rowTint = wi % 2 === 1;
          return (
            <tbody key={weekKey}>
              <tr className="bg-slate-100/70">
                <td
                  colSpan={13}
                  className="border-y border-slate-200/80 border-l-[3px] border-l-emerald-500 px-5 py-2.5 text-sm font-semibold tracking-wide text-slate-700"
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
                />
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
