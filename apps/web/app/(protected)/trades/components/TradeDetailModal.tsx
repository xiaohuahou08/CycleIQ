"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  Calendar,
  CalendarCheck,
  CircleCheck,
  Clock,
  ExternalLink,
  Info,
  LineChart,
  Pencil,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { iconSm, iconStroke, iconXs } from "@/app/components/icons";
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

  /* roll history — walk rolled_from_id chain backwards to build ancestor list */
  const rollChain = React.useMemo(() => {
    const chain: Trade[] = [trade];
    const byId = new Map(allTrades.map((t) => [t.id, t]));
    let cur = trade.rolled_from_id ? byId.get(trade.rolled_from_id) : undefined;
    const seen = new Set<string>([trade.id]);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur);
      cur = cur.rolled_from_id ? byId.get(cur.rolled_from_id) : undefined;
    }
    return chain;
  }, [trade, allTrades]);
  const showRollHistory = rollChain.length > 1;

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
              <X className={iconSm} strokeWidth={iconStroke} aria-hidden />
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
                      <LineChart className={iconXs} strokeWidth={iconStroke} aria-hidden />
                    ) : (
                      <Info className={iconXs} strokeWidth={iconStroke} aria-hidden />
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
                  Icon: Calendar,
                  label: "Opened",
                  value: fmtDate(trade.trade_date),
                },
                {
                  Icon: Calendar,
                  label: "Expiration",
                  value: fmtDate(trade.expiry),
                },
                {
                  Icon: Clock,
                  label: "Days in Trade",
                  value: `${dit}d`,
                },
                {
                  Icon: Clock,
                  label: "Days to Expiry",
                  value: `${dte}d`,
                },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-gray-500">
                    <Icon className={iconSm} strokeWidth={iconStroke} aria-hidden />
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
                  <RotateCw className={iconSm} strokeWidth={iconStroke} aria-hidden />
                  Roll History
                </div>
                {rollChain.map((t, i) => {
                  const isLast = i === rollChain.length - 1;
                  const label = i === 0 ? "Original" : isLast ? "Current" : `Roll ${i}`;
                  return (
                    <RollItem key={t.id} trade={t} label={label} isLast={isLast} />
                  );
                })}
                {trade.status === "ASSIGNED" && trade.prior_roll_premium_per_share != null && (
                  <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
                    <span className="font-semibold">Accumulated roll premium:</span>{" "}
                    ${trade.prior_roll_premium_per_share.toFixed(4)}/share — already deducted from stock cost basis.
                  </div>
                )}
              </div>
            )}

            {/* ── primary actions ── */}
            <div className="flex flex-wrap justify-center gap-2">
              {(
                trade.status === "ASSIGNED" || (trade.option_type === "PUT" && trade.status === "EXPIRED")
                  ? [
                      { label: "Edit", Icon: Pencil, onClick: () => { onClose(); onEdit(trade); } },
                    ]
                  : [
                      { label: "Edit", Icon: Pencil, onClick: () => { onClose(); onEdit(trade); } },
                      { label: "Roll", Icon: RotateCw, onClick: () => { onClose(); onAction(trade, "roll"); } },
                      { label: "Buy to Close", Icon: ArrowLeftRight, onClick: () => { onClose(); onAction(trade, "buy_to_close"); } },
                      { label: trade.option_type === "CALL" ? "Call Away" : "Assign", Icon: CircleCheck, onClick: () => { onClose(); onAction(trade, "assign"); } },
                      { label: "Expire", Icon: CalendarCheck, onClick: () => { onClose(); onAction(trade, "expire"); } },
                    ]
              ).map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Icon className={iconSm} strokeWidth={iconStroke} aria-hidden />
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
                <ExternalLink className={iconSm} strokeWidth={iconStroke} aria-hidden />
                Explore {trade.ticker}
              </a>
              <button
                type="button"
                onClick={() => { onClose(); onDelete(trade.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600 shadow-sm hover:bg-red-100"
              >
                <Trash2 className={iconSm} strokeWidth={iconStroke} aria-hidden />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
