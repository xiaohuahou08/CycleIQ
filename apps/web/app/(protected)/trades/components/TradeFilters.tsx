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
    ? "shrink-0 border-b border-slate-200/80 bg-white"
    : "rounded-xl border border-slate-200 bg-white shadow-sm";

  const pillActive =
    "bg-slate-900 text-white shadow-sm";
  const pillIdle =
    "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900";

  return (
    <div className={shell}>
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div ref={searchWrapRef} className="relative w-full min-w-[8.5rem] max-w-[10rem] shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className={iconSm} strokeWidth={iconStroke} aria-hidden />
            </span>
            <input
              type="text"
              placeholder="Search ticker…"
              value={filters.search}
              autoComplete="off"
              onChange={(e) => {
                apply({ search: e.target.value });
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 py-0 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {suggestOpen && matchingTickers.length > 0 && (
              <ul
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg ring-1 ring-slate-900/5"
                role="listbox"
              >
                {matchingTickers.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-900 hover:bg-slate-50"
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

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleCsp}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold uppercase tracking-wide transition ${
                filters.type === "PUT" ? pillActive : pillIdle
              }`}
            >
              <CircleDot className={iconSm} strokeWidth={iconStroke} aria-hidden />
              CSP
            </button>
            <button
              type="button"
              onClick={toggleCc}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold uppercase tracking-wide transition ${
                filters.type === "CALL" ? pillActive : pillIdle
              }`}
            >
              <LineChart className={iconSm} strokeWidth={iconStroke} aria-hidden />
              CC
            </button>
          </div>

          {onAddTrade && (
            <button
              type="button"
              onClick={onAddTrade}
              className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              + Add trade
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max min-w-full items-center gap-0.5 rounded-lg bg-slate-100/90 p-1">
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
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className={iconSm} strokeWidth={iconStroke} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={applySinceLastMonth}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition ${
                filters.dateRangeType === "1M"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              Since last month
            </button>
            <div
              className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 ${
                filters.dateRangeType === "CUSTOM"
                  ? "border-slate-300 bg-slate-50 ring-1 ring-slate-200/80"
                  : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => apply({ dateRangeType: "CUSTOM" })}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  filters.dateRangeType === "CUSTOM"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Custom
              </button>
              <span className="text-slate-200" aria-hidden>
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
              <span className="text-xs text-slate-400">–</span>
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
        </div>
      </div>
    </div>
  );
}
