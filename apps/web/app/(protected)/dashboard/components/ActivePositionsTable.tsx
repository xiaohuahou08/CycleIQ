import { useEffect, useMemo, useState } from "react";
import type { Trade, TradeStatus } from "@/lib/api/trades";

const statusStyles: Record<TradeStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CLOSED: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-600",
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

function getDte(expiry: string): number {
  const diffMs = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function getStrategy(trade: Trade): "CSP" | "CC" {
  return trade.option_type === "PUT" ? "CSP" : "CC";
}

const LOGO_URL_BUILDERS = [
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function TickerLogo({ ticker }: { ticker: string }) {
  const urls = useMemo(() => LOGO_URL_BUILDERS.map((build) => build(ticker)), [ticker]);
  const [urlIndex, setUrlIndex] = useState(0);

  useEffect(() => {
    setUrlIndex(0);
  }, [ticker]);

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
      alt={`${ticker} logo`}
      className="h-5 w-5 rounded object-cover"
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

interface ActivePositionsTableProps {
  trades: Trade[];
  loading: boolean;
}

export default function ActivePositionsTable({
  trades,
  loading,
}: ActivePositionsTableProps) {
  const displayed = trades.slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Active Positions</h2>
        {trades.length > 5 && (
          <span className="text-xs text-gray-500">{trades.length} total</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="text-4xl">📋</div>
          <p className="mt-3 text-sm font-medium text-gray-900">No trades yet</p>
          <p className="mt-1 text-xs text-gray-500">No active positions at the moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Ticker</th>
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3">Strike</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">DTE</th>
                <th className="px-5 py-3">Premium</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <TickerLogo ticker={trade.ticker} />
                      <span>{trade.ticker}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {getStrategy(trade)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    ${trade.strike.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {fmtDate(trade.expiry)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {getDte(trade.expiry)}d
                  </td>
                  <td className="px-5 py-3 font-medium text-green-700">
                    +${(trade.premium * trade.contracts * 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[trade.status]}`}
                    >
                      {trade.status}
                    </span>
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
