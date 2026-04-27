"use client";

import { useState } from "react";

interface TradeFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

interface FilterState {
  ticker: string;
  type: string; // "ALL" | "PUT" | "CALL"
  status: string; // "ALL" | TradeStatus
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

export default function TradeFilters({
  onFilterChange,
  totalCount,
  filteredCount,
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
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[160px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search ticker or notes…"
            value={filters.search}
            onChange={(e) => apply({ search: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Ticker */}
        <input
          type="text"
          placeholder="Ticker"
          value={filters.ticker}
          onChange={(e) => apply({ ticker: e.target.value.toUpperCase() })}
          className="w-20 rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-3 text-sm uppercase text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none"
        />

        {/* Type */}
        <select
          value={filters.type}
          onChange={(e) => apply({ type: e.target.value })}
          className="rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none"
        >
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => apply({ status: e.target.value })}
          className="rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none"
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          title="From date"
          value={filters.dateFrom}
          onChange={(e) => apply({ dateFrom: e.target.value })}
          className="rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none"
        />

        {/* Date To */}
        <input
          type="date"
          title="To date"
          value={filters.dateTo}
          onChange={(e) => apply({ dateTo: e.target.value })}
          className="rounded-lg border border-gray-200 bg-gray-200 bg-gray-50 py-1.5 px-2 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none"
        />

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* Count */}
      <div className="mt-2 text-xs text-gray-400">
        {filteredCount === totalCount
          ? `${totalCount} trade${totalCount !== 1 ? "s" : ""}`
          : `${filteredCount} of ${totalCount} trades shown`}
      </div>
    </div>
  );
}
