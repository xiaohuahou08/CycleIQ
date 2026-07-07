"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { iconStroke } from "@/app/components/icons";
import { STATUS_COLORS } from "@/app/components/ui/styles";
import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";
import type { Trade, TradeStatus } from "@/lib/api/trades";

const statusStyles: Record<TradeStatus, string> = {
  OPEN: STATUS_COLORS.OPEN,
  CLOSED: STATUS_COLORS.CLOSED,
  EXPIRED: STATUS_COLORS.EXPIRED,
  ASSIGNED: STATUS_COLORS.ASSIGNED,
  CALLED_AWAY: STATUS_COLORS.CALLED_AWAY,
  ROLLED: STATUS_COLORS.ROLLED,
};

function fmtDate(iso: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function getDte(expiry: string): number {
  const diffMs = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(
      ticker
    )}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function TickerLogo({
  ticker,
  logoAlt,
}: {
  ticker: string;
  logoAlt: string;
}) {
  const urls = useMemo(() => LOGO_URL_BUILDERS.map((build) => build(ticker)), [ticker]);
  const [urlIndex, setUrlIndex] = useState(0);

  if (urlIndex >= urls.length) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-semibold text-blue-700">
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={urls[urlIndex]}
      alt={logoAlt}
      className="h-5 w-5 rounded object-cover"
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

interface ActivePositionsTableProps {
  trades: Trade[];
}

export default function ActivePositionsTable({
  trades,
}: ActivePositionsTableProps) {
  const { t } = useTranslations("dashboard");
  const { t: tCommon } = useTranslations("common");
  const { intlLocale } = useLocale();
  const displayed = trades.slice(0, 5);

  const statusLabel = (status: TradeStatus) => tCommon(`status.${status}`);

  const getStrategy = (trade: Trade) =>
    trade.option_type === "PUT" ? tCommon("strategy.csp") : tCommon("strategy.cc");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {trades.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ClipboardList className="h-6 w-6" strokeWidth={iconStroke} aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-900">{t("positions.empty.title")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("positions.empty.body")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.ticker")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.strategy")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.strike")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.expiry")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.dte")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.premium")}
                </th>
                <th className="border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-800">
                  {tCommon("columns.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((trade) => (
                <tr key={trade.id} className="transition-colors hover:bg-emerald-50/40">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <TickerLogo
                        key={trade.ticker}
                        ticker={trade.ticker}
                        logoAlt={t("positions.logoAlt", { ticker: trade.ticker })}
                      />
                      <span>{trade.ticker}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{getStrategy(trade)}</td>
                  <td className="px-5 py-3 text-slate-600">${trade.strike.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600">{fmtDate(trade.expiry, intlLocale)}</td>
                  <td className="px-5 py-3 text-slate-600">{getDte(trade.expiry)}d</td>
                  <td className="px-5 py-3 font-medium text-emerald-600">
                    +${(trade.premium * trade.contracts * 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary" className={statusStyles[trade.status]}>
                      {statusLabel(trade.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
