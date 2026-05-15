"use client";

import { useState } from "react";
import type { Trade } from "@/lib/api/trades";

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  onAddTrade: () => void;
  onDeleteTrade: (id: string) => void;
}

export default function TradeList({
  trades,
  loading,
  onAddTrade,
  onDeleteTrade,
}: TradeListProps) {
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // Group trades by ticker
  const tradesByTicker = trades.reduce<Record<string, Trade[]>>((acc, trade) => {
    if (!acc[trade.ticker]) {
      acc[trade.ticker] = [];
    }
    acc[trade.ticker].push(trade);
    return acc;
  }, {});

  const tickers = Object.keys(tradesByTicker).sort();

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
          <p className="text-gray-500">Loading trades...</p>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No trades yet</p>
          <button
            type="button"
            onClick={onAddTrade}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add your first trade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickers.map((ticker) => {
        const tickerTrades = tradesByTicker[ticker];
        const isExpanded = expandedTicker === ticker;

        return (
          <div key={ticker} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setExpandedTicker(isExpanded ? null : ticker)}
            >
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">{ticker}</h3>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {tickerTrades.length} trade{tickerTrades.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-gray-500">
                {isExpanded ? "▼" : "▶"}
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Strike
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Premium
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contracts
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickerTrades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trade.option_type === "PUT"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}>
                              {trade.option_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${trade.strike}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(trade.expiry).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(trade.premium * 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.contracts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trade.status === "OPEN"
                                ? "bg-blue-100 text-blue-800"
                                : trade.status === "CLOSED"
                                ? "bg-gray-100 text-gray-800"
                                : trade.status === "EXPIRED"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {trade.notes}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => onDeleteTrade(trade.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
