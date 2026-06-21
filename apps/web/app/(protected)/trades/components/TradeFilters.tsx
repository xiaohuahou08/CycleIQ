"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowDownToLine,
  Calendar,
  Check,
  CircleDot,
  Clock,
  LineChart,
  RotateCw,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import DatePicker from "@/app/components/DatePicker";
import { iconSm, iconStroke } from "@/app/components/icons";

export interface FilterState {
  type: string;
  status: string;
  search: string;
  dateRangeType?: "1M" | "CUSTOM";
  startDate?: string;
  endDate?: string;
}

const STATUS_ROW: ReadonlyArray<{
  key: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { key: "OPEN", label: "Open", Icon: Clock },
  { key: "CLOSED", label: "Closed", Icon: Check },
  { key: "EXPIRED", label: "Expired", Icon: Calendar },
  { key: "ASSIGNED", label: "Assigned", Icon: ArrowDownToLine },
  { key: "CALLED_AWAY", label: "Away", Icon: TrendingUp },
  { key: "ROLLED", label: "Rolled", Icon: RotateCw },
];

interface TradeFiltersProps {
  filters: FilterState;
  onFilterChange: Dispatch<SetStateAction<FilterState>>;
  tickerSuggestions?: string[];
  onAddTrade?: () => void;
  /** When wrapped in outer card (rounded border/shadow handled by parent) */
  embedded?: boolean;
}

export default function TradeFilters({
  filters,
  onFilterChange,
  tickerSuggestions = [],
  onAddTrade,
  embedded = false,
}: TradeFiltersProps) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const matchingTickers = useMemo(() => {
    const raw = filters.search.trim();
    if (!raw) return [];
    const q = raw.toLowerCase();
    return tickerSuggestions
      .filter((t) => {
        const tl = t.toLowerCase();
        return tl.startsWith(q) || tl.includes(q);
      })
      .sort((a, b) => {
        const al = a.toLowerCase().startsWith(q);
        const bl = b.toLowerCase().startsWith(q);
        if (al !== bl) return al ? -1 : 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);
  }, [filters.search, tickerSuggestions]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [suggestOpen]);

  const apply = (patch: Partial<FilterState>) => {
    onFilterChange((prev) => ({ ...prev, ...patch }));
  };

  const applySinceLastMonth = () => {
    apply({ dateRangeType: "1M", startDate: undefined, endDate: undefined });
  };

  const switchOptionType = (type: "PUT" | "CALL") => {
    if (filters.type === type) return;
    let status = filters.status;
    if (type === "PUT" && status === "CALLED_AWAY") status = "OPEN";
    if (type === "CALL" && status === "ASSIGNED") status = "OPEN";
    apply({
      type,
      status,
      dateRangeType: "1M",
      startDate: undefined,
      endDate: undefined,
    });
  };

  const toggleCsp = () => switchOptionType("PUT");
  const toggleCc = () => switchOptionType("CALL");

  const shell = embedded
    ? "shrink-0 border-b border-gray-100 bg-white"
    : "rounded-xl border border-gray-200 bg-white shadow-sm";

  return (
    <div className={shell}>
      <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <div ref={searchWrapRef} className="relative w-36 shrink-0">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
            <Search className={iconSm} strokeWidth={iconStroke} aria-hidden />
          </span>
          <input
            type="text"
            placeholder="Ticker…"
            value={filters.search}
            autoComplete="off"
            onChange={(e) => {
              apply({ search: e.target.value });
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
          />
          {suggestOpen && matchingTickers.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-[13px] shadow-lg"
              role="listbox"
            >
              {matchingTickers.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-[13px] font-semibold uppercase text-gray-900 hover:bg-gray-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      apply({ search: t });
                      setSuggestOpen(false);
                    }}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleCsp}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold uppercase tracking-wide transition ${
              filters.type === "PUT"
                ? "bg-gray-900 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-gray-50"
            }`}
          >
            <CircleDot
              className={iconSm}
              strokeWidth={iconStroke}
              aria-hidden
            />
            CSP
          </button>
          <button
            type="button"
            onClick={toggleCc}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold uppercase tracking-wide transition ${
              filters.type === "CALL"
                ? "bg-gray-900 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-gray-50"
            }`}
          >
            <LineChart className={iconSm} strokeWidth={iconStroke} aria-hidden />
            CC
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max min-w-full items-center gap-1 rounded-full bg-[#eef0f4] p-1">
            {STATUS_ROW.filter(({ key }) => {
              if (filters.type === "PUT" && key === "CALLED_AWAY") return false;
              if (filters.type === "CALL" && key === "ASSIGNED") return false;
              return true;
            }).map(({ key, label, Icon }) => {
              const active = filters.status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    apply({
                      status: key,
                      dateRangeType: "1M",
                      startDate: undefined,
                      endDate: undefined,
                    })
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold capitalize transition ${
                    active
                      ? "border border-transparent bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-gray-100"
                      : "border border-transparent bg-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className={iconSm} strokeWidth={iconStroke} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-l border-gray-200 pl-3">
          <button
            type="button"
            onClick={applySinceLastMonth}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              filters.dateRangeType === "1M"
                ? "bg-gray-900 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Since last month
          </button>
          <div
            className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 ${
              filters.dateRangeType === "CUSTOM"
                ? "border-gray-400 bg-gray-50 ring-1 ring-gray-200"
                : "border-gray-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => apply({ dateRangeType: "CUSTOM" })}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                filters.dateRangeType === "CUSTOM"
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Custom
            </button>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <DatePicker
              value={filters.startDate}
              placeholder="From"
              emphasized={filters.dateRangeType === "CUSTOM"}
              aria-label="From date"
              onChange={(startDate) =>
                apply({
                  dateRangeType: "CUSTOM",
                  startDate,
                })
              }
            />
            <span className="text-[11px] text-gray-400">–</span>
            <DatePicker
              value={filters.endDate}
              placeholder="To"
              emphasized={filters.dateRangeType === "CUSTOM"}
              aria-label="To date"
              onChange={(endDate) =>
                apply({
                  dateRangeType: "CUSTOM",
                  endDate,
                })
              }
            />
          </div>
        </div>

        {onAddTrade && (
          <button
            type="button"
            onClick={onAddTrade}
            className="ml-auto shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] hover:bg-gray-800"
          >
            + Add trade
          </button>
        )}
      </div>
    </div>
  );
}
