"use client";

import { useEffect, useRef } from "react";
import type { Trade, TradeStatus } from "@/lib/api/trades";

/* ─────────────────────────── types ─────────────────────────── */
interface TradeDetailModalProps {
  trade: Trade | null;
  allTrades: Trade[];
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onAction: (
    trade: Trade,
    action: "buy_to_close" | "expire" | "assign" | "roll"
  ) => void;
  onDelete: (id: string) => void;
}

/* ─────────────────────────── constants ─────────────────────────── */
const STATUS_STYLES: Record<TradeStatus, string> = {
  OPEN: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  CLOSED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  EXPIRED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  ASSIGNED: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  CALLED_AWAY: "bg-red-50 text-red-800 ring-1 ring-red-200",
  ROLLED: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
};

const LOGO_URL_BUILDERS = [
  (t: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(t)}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (t: string) => `https://financialmodelingprep.com/image-stock/${t}.png`,
  (t: string) => `https://eodhd.com/img/logos/US/${t}.png`,
];

/* ─────────────────────────── helpers ─────────────────────────── */
function parseDateLike(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }
  return new Date(s);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parseDateLike(iso));
}

function getDte(expiry: string): number {
  return Math.max(
    0,
    Math.ceil(
      (parseDateLike(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );
}

function daysBetween(from: string, to?: string | null): number {
  const a = parseDateLike(from).getTime();
  const b = to ? parseDateLike(to).getTime() : Date.now();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function capitalAtRisk(t: Trade): number {
  const price =
    t.option_type === "CALL" && t.stock_cost_basis_per_share != null
      ? t.stock_cost_basis_per_share
      : t.strike;
  return price * t.contracts * 100;
}

function netPremium(t: Trade): number {
  return t.premium * t.contracts * 100 - (t.commission_fee ?? 0);
}

/** Realized P&L: 0 for open trades, full net premium for closed/expired/etc. */
function realizedPnl(t: Trade): number {
  return t.status === "OPEN" ? 0 : netPremium(t);
}

function pct(value: number, cap: number): number {
  return cap > 0 ? (value / cap) * 100 : 0;
}

function fmtPct(v: number, decimals = 1): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtUsd(v: number, forceSign = false): string {
  const sign = forceSign && v >= 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function resultLabel(t: Trade): string {
  switch (t.status) {
    case "OPEN": return "—";
    case "CLOSED": return "Closed";
    case "EXPIRED":
      return t.expire_type === "EXPIRED_ITM" ? "Expired ITM" : "Expired OTM";
    case "ASSIGNED": return "Assigned";
    case "CALLED_AWAY": return "Called Away";
    case "ROLLED": return "Rolled";
    default: return "—";
  }
}

/* ─────────────────────────── tiny SVG icons ─────────────────────────── */
function Ic({
  children,
  className = "h-4 w-4",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const IcX = () => (
  <Ic><path d="M18 6 6 18M6 6l12 12" /></Ic>
);
const IcCalendar = () => (
  <Ic><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 11h16" /></Ic>
);
const IcClock = () => (
  <Ic><circle cx="12" cy="12" r="8" /><path d="M12 7v6l4 2" /></Ic>
);
const IcPencil = () => (
  <Ic><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></Ic>
);
const IcRefresh = () => (
  <Ic><path d="M21 12a9 9 0 1 0-9 9" /><path d="M21 3v9h-9" /></Ic>
);
const IcArrows = () => (
  <Ic><path d="M7 16V4m0 0L3 8m4-4 4 4" /><path d="M17 8v12m0 0 4-4m-4 4-4-4" /></Ic>
);
const IcCheck = () => (
  <Ic><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></Ic>
);
const IcExpire = () => (
  <Ic><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 11h16M9 16l2 2 4-4" /></Ic>
);
const IcTrash = () => (
  <Ic><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6m4-6v6" /><path d="M9 6V4h6v2" /></Ic>
);
const IcExternal = () => (
  <Ic><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Ic>
);

/* ─────────────────────────── logo ─────────────────────────── */
function TickerLogo({ ticker }: { ticker: string }) {
  const [idx, setIdx] = React.useState(0);

  if (idx >= LOGO_URL_BUILDERS.length) {
    return (
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-lg font-bold text-blue-700">
        {ticker.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={LOGO_URL_BUILDERS[idx](ticker)}
      alt=""
      className="h-14 w-14 rounded-xl object-cover ring-1 ring-gray-100"
      onError={() => setIdx((p) => p + 1)}
      loading="lazy"
    />
  );
}

import React from "react";

/* ─────────────────────────── roll history item ─────────────────────────── */
function RollItem({
  trade,
  label,
  isLast,
}: {
  trade: Trade;
  label: string;
  isLast: boolean;
}) {
  const premium = trade.premium * trade.contracts * 100;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 h-3 w-3 rounded-full border-2 ${
            isLast
              ? "border-violet-500 bg-violet-500"
              : "border-gray-300 bg-white"
          }`}
        />
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
      </div>
      <div
        className={`mb-3 flex-1 rounded-xl px-4 py-3 ${
          isLast ? "bg-violet-50 ring-1 ring-violet-100" : "bg-gray-50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-gray-900">
            ${trade.strike.toFixed(2)}
          </span>
          <span className="text-[13px] font-semibold text-emerald-600">
            +${premium.toFixed(2)}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[trade.status]}`}
          >
            {trade.status.replaceAll("_", " ")}
          </span>
          <span className="text-[11px] text-gray-400">{label}</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          {trade.trade_date} → {trade.expiry}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── modal ─────────────────────────── */
export default function TradeDetailModal({
  trade,
  allTrades,
  onClose,
  onEdit,
  onAction,
  onDelete,
}: TradeDetailModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trade) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trade, onClose]);

  if (!trade) return null;

  /* roll history */
  const cycleChain =
    trade.cycle_id
      ? allTrades
          .filter((t) => t.cycle_id === trade.cycle_id)
          .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      : [trade];
  const showRollHistory = cycleChain.length > 1 && cycleChain.some((t) => t.status === "ROLLED");

  /* metrics */
  const cap = capitalAtRisk(trade);
  const net = netPremium(trade);
  const pnl = realizedPnl(trade);
  const retPct = pct(pnl, cap);
  const dit = daysBetween(trade.trade_date);
  const dte = getDte(trade.expiry);
  /* Ann. ROI if expires: uses full planned trade duration (open → expiry) */
  const totalDays = daysBetween(trade.trade_date, trade.expiry);
  const annIfExpiresPct = cap > 0 ? (net / cap) * (365 / totalDays) * 100 : 0;
  /* Annualized return (actual realized) */
  const annRetPct = cap > 0 ? (pnl / cap) * (365 / dit) * 100 : 0;

  const strategy = trade.option_type === "PUT" ? "CSP" : "CC";
  const description = `${trade.option_type === "PUT" ? "Sell Put" : "Sell Call"} · ${trade.contracts} contract${trade.contracts !== 1 ? "s" : ""}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* ── header ── */}
          <div className="flex items-start gap-4 px-5 py-5">
            <TickerLogo ticker={trade.ticker} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[20px] font-bold text-gray-900">
                  {trade.ticker}
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {strategy}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[trade.status]}`}
                >
                  {trade.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <IcX />
            </button>
          </div>

          <div className="space-y-4 px-5 pb-5">
            {/* ── 2×2 stats grid ── */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Strike Price",
                  value: `$${trade.strike.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  green: false,
                },
                {
                  label: "Premium Collected",
                  value: fmtUsd(net, true),
                  green: true,
                },
                {
                  label: "Realized P&L",
                  value: fmtUsd(pnl, true),
                  green: pnl >= 0,
                },
                {
                  label: "Capital at Risk",
                  value: `$${cap.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
                  green: false,
                },
              ].map(({ label, value, green }) => (
                <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                    {green ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" d="M3 17l7-8 5 6 8-13" /><path d="M21 17H3" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" d="M12 8v4m0 4h.01" /><circle cx="12" cy="12" r="9" /></svg>
                    )}
                    {label}
                  </p>
                  <p
                    className={`mt-1 text-[20px] font-bold tabular-nums ${
                      green ? "text-emerald-600" : "text-gray-900"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── 4-col metrics ── */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Return", value: fmtPct(retPct, 2), highlight: false },
                { label: "Annualized", value: fmtPct(annRetPct, 1), highlight: false },
                {
                  label: "Ann. ROI if expires",
                  value: fmtPct(annIfExpiresPct, 1),
                  highlight: true,
                },
                { label: "Result", value: resultLabel(trade), highlight: false },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={`rounded-xl px-3 py-3 text-center ${
                    highlight
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <p className="text-[10px] font-medium leading-tight text-gray-400">
                    {label}
                  </p>
                  <p
                    className={`mt-1 text-[14px] font-bold tabular-nums ${
                      highlight ? "text-blue-700" : "text-gray-900"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── timeline ── */}
            <div className="space-y-2 rounded-xl bg-gray-50 px-4 py-3">
              {[
                {
                  Icon: IcCalendar,
                  label: "Opened",
                  value: fmtDate(trade.trade_date),
                },
                {
                  Icon: IcCalendar,
                  label: "Expiration",
                  value: fmtDate(trade.expiry),
                },
                {
                  Icon: IcClock,
                  label: "Days in Trade",
                  value: `${dit}d`,
                },
                {
                  Icon: IcClock,
                  label: "Days to Expiry",
                  value: `${dte}d`,
                },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-gray-500">
                    <Icon />
                    {label}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
              {trade.notes?.trim() && (
                <p className="border-t border-gray-200 pt-2 text-[12px] text-gray-500">
                  {trade.notes.trim()}
                </p>
              )}
            </div>

            {/* ── roll history ── */}
            {showRollHistory && (
              <div>
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  <IcRefresh />
                  Roll History
                </div>
                {cycleChain.map((t, i) => {
                  const isLast = i === cycleChain.length - 1;
                  const label = i === 0 ? "Original" : isLast ? "Current" : `Roll ${i}`;
                  return (
                    <RollItem key={t.id} trade={t} label={label} isLast={isLast} />
                  );
                })}
              </div>
            )}

            {/* ── primary actions ── */}
            <div className="flex flex-wrap justify-center gap-2">
              {(
                [
                  { label: "Edit", Icon: IcPencil, onClick: () => { onClose(); onEdit(trade); } },
                  { label: "Roll", Icon: IcRefresh, onClick: () => { onClose(); onAction(trade, "roll"); } },
                  { label: "Buy to Close", Icon: IcArrows, onClick: () => { onClose(); onAction(trade, "buy_to_close"); } },
                  { label: "Assign", Icon: IcCheck, onClick: () => { onClose(); onAction(trade, "assign"); } },
                  { label: "Expire", Icon: IcExpire, onClick: () => { onClose(); onAction(trade, "expire"); } },
                ] as const
              ).map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            {/* ── secondary actions ── */}
            <div className="flex flex-wrap justify-center gap-2 border-t border-gray-100 pt-3">
              <a
                href={`https://finance.yahoo.com/quote/${trade.ticker}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <IcExternal />
                Explore {trade.ticker}
              </a>
              <button
                type="button"
                onClick={() => { onClose(); onDelete(trade.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600 shadow-sm hover:bg-red-100"
              >
                <IcTrash />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
