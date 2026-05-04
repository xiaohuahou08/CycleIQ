"use client";

import { useState } from "react";

export interface FilterState {
  ticker: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const STATUS_LABELS: Record<string, string> = {
  ALL: "All Status",
  OPEN: "Open",
  CLOSED: "Closed",
  EXPIRED: "Expired",
  ASSIGNED: "Assigned",
  CALLED_AWAY: "Called Away",
  ROLLED: "Rolled",
};

const TYPE_LABELS: Record<string, string> = {
  ALL: "All Types",
  PUT: "CSP (Sell Put)",
  CALL: "CC (Sell Call)",
};

interface TradeFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
  onAddTrade?: () => void;
}

export default function TradeFilters({
  onFilterChange,
  totalCount,
  filteredCount,
  onAddTrade,
}: TradeFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    ticker: "",
    type: "ALL",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const apply = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange(next);
  };

  const reset = () => {
    const blank: FilterState = {
      ticker: "",
      type: "ALL",
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      search: "",
    };
    setFilters(blank);
    onFilterChange(blank);
  };

  const hasFilters =
    filters.ticker !== "" ||
    filters.type !== "ALL" ||
    filters.status !== "ALL" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.search !== "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-[min(100%,12rem)]">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search ticker or notes…"
            value={filters.search}
            onChange={(e) => apply({ search: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none"
          />
        </div>

        <input
          type="text"
          placeholder="Ticker"
          value={filters.ticker}
          onChange={(e) => apply({ ticker: e.target.value.toUpperCase() })}
          className="w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm uppercase text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none"
        />

        {onAddTrade && (
          <button
            type="button"
            onClick={onAddTrade}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Add Trade
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
        {Object.entries(TYPE_LABELS).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => apply({ type: val })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filters.type === val
                ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => apply({ status: val })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filters.status === val
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-gray-100 pt-2">
        <span className="shrink-0 text-xs font-medium text-gray-500">Trade date</span>
        <input
          type="date"
          title="From date"
          value={filters.dateFrom}
          onChange={(e) => apply({ dateFrom: e.target.value })}
          className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-300 focus:bg-white focus:outline-none"
        />
        <span className="shrink-0 text-xs text-gray-400">to</span>
        <input
          type="date"
          title="To date"
          value={filters.dateTo}
          onChange={(e) => apply({ dateTo: e.target.value })}
          className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-300 focus:bg-white focus:outline-none"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {filteredCount === totalCount
          ? `${totalCount} trade${totalCount !== 1 ? "s" : ""}`
          : `${filteredCount} of ${totalCount} trades shown`}
      </div>
    </div>
  );
}
