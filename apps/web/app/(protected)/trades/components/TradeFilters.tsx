"use client";

import { useState } from "react";

export type FilterState = {
  ticker: string;
  type: "ALL" | "PUT" | "CALL";
  status: "ALL" | "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
  dateFrom: string;
  dateTo: string;
  search: string;
};

interface TradeFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export default function TradeFilters({
  onFilterChange,
  totalCount,
  filteredCount,
}: TradeFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>({
    ticker: "",
    type: "ALL",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const handleFilterChange = (updates: Partial<FilterState>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="sr-only" htmlFor="search">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search ticker or notes..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        {/* Ticker */}
        <div className="w-[200px]">
          <label className="sr-only" htmlFor="ticker">
            Ticker
          </label>
          <input
            type="text"
            id="ticker"
            placeholder="Ticker"
            value={localFilters.ticker}
            onChange={(e) => handleFilterChange({ ticker: e.target.value.toUpperCase() })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        {/* Type */}
        <div className="w-[150px]">
          <label className="sr-only" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            value={localFilters.type}
            onChange={(e) => handleFilterChange({ type: e.target.value as "ALL" | "PUT" | "CALL" })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="ALL">All Types</option>
            <option value="PUT">PUT</option>
            <option value="CALL">CALL</option>
          </select>
        </div>

        {/* Status */}
        <div className="w-[150px]">
          <label className="sr-only" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value as "ALL" | "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED" })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="EXPIRED">Expired</option>
            <option value="ASSIGNED">Assigned</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <div className="w-[140px]">
            <label className="sr-only" htmlFor="dateFrom">
              From
            </label>
            <input
              type="date"
              id="dateFrom"
              value={localFilters.dateFrom}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-[140px]">
            <label className="sr-only" htmlFor="dateTo">
              To
            </label>
            <input
              type="date"
              id="dateTo"
              value={localFilters.dateTo}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clear filters */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleFilterChange({
              ticker: "",
              type: "ALL",
              status: "ALL",
              dateFrom: "",
              dateTo: "",
              search: "",
            })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter count */}
      <div className="mt-3 text-sm text-gray-500">
        Showing {filteredCount} of {totalCount} trades
      </div>
    </div>
  );
}
