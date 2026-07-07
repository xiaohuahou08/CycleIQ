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
import { PILL_ACTIVE, PILL_IDLE } from "@/app/components/ui/styles";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/locale-context";

export interface FilterState {
  type: string;
  status: string;
  search: string;
  dateRangeType?: "1M" | "CUSTOM";
  startDate?: string;
  endDate?: string;
}

const DEFAULT_FILTERS: FilterState = {
  type: "PUT",
  status: "OPEN",
  search: "",
  dateRangeType: "1M",
};

const STATUS_ROW: ReadonlyArray<{
  key: string;
  labelKey: string;
  Icon: LucideIcon;
}> = [
  { key: "OPEN", labelKey: "open", Icon: Clock },
  { key: "CLOSED", labelKey: "closed", Icon: Check },
  { key: "EXPIRED", labelKey: "expired", Icon: Calendar },
  { key: "ASSIGNED", labelKey: "assigned", Icon: ArrowDownToLine },
  { key: "CALLED_AWAY", labelKey: "away", Icon: TrendingUp },
  { key: "ROLLED", labelKey: "rolled", Icon: RotateCw },
];

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.type !== DEFAULT_FILTERS.type) count++;
  if (filters.status !== DEFAULT_FILTERS.status) count++;
  if (filters.search.trim()) count++;
  if (filters.dateRangeType === "CUSTOM" || filters.startDate || filters.endDate) count++;
  return count;
}

interface TradeFiltersProps {
  filters: FilterState;
  onFilterChange: Dispatch<SetStateAction<FilterState>>;
  tickerSuggestions?: string[];
  onAddTrade?: () => void;
  addTradeDisabled?: boolean;
  addTradeDisabledReason?: string;
  tradesUsageLabel?: string;
  embedded?: boolean;
}

export default function TradeFilters({
  filters,
  onFilterChange,
  tickerSuggestions = [],
  onAddTrade,
  addTradeDisabled = false,
  addTradeDisabledReason,
  tradesUsageLabel,
  embedded = false,
}: TradeFiltersProps) {
  const { t } = useTranslations("trades");
  const { t: tCommon } = useTranslations("common");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const matchingTickers = useMemo(() => {
    const raw = filters.search.trim();
    if (!raw) return [];
    const q = raw.toLowerCase();
    return tickerSuggestions
      .filter((ticker) => {
        const tl = ticker.toLowerCase();
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

  const clearFilters = () => {
    onFilterChange(DEFAULT_FILTERS);
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
    : "rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]";

  return (
    <div className={shell}>
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div ref={searchWrapRef} className="relative w-full min-w-[8.5rem] max-w-[10rem] shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search className={iconSm} strokeWidth={iconStroke} aria-hidden />
            </span>
            <input
              type="text"
              placeholder={t("filters.searchPlaceholder")}
              value={filters.search}
              autoComplete="off"
              onChange={(e) => {
                apply({ search: e.target.value });
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white py-0 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
            />
            {suggestOpen && matchingTickers.length > 0 && (
              <ul
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg ring-1 ring-slate-900/5"
                role="listbox"
              >
                {matchingTickers.map((ticker) => (
                  <li key={ticker}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-900 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        apply({ search: ticker });
                        setSuggestOpen(false);
                      }}
                    >
                      {ticker}
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
                filters.type === "PUT" ? PILL_ACTIVE : PILL_IDLE
              }`}
            >
              <CircleDot className={iconSm} strokeWidth={iconStroke} aria-hidden />
              {tCommon("strategy.csp")}
            </button>
            <button
              type="button"
              onClick={toggleCc}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold uppercase tracking-wide transition ${
                filters.type === "CALL" ? PILL_ACTIVE : PILL_IDLE
              }`}
            >
              <LineChart className={iconSm} strokeWidth={iconStroke} aria-hidden />
              {tCommon("strategy.cc")}
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              {t("filters.clearFilters")}
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700">
                {activeFilterCount}
              </span>
            </button>
          )}

          {onAddTrade && (
            <div className="ml-auto flex shrink-0 items-center gap-3">
              {tradesUsageLabel && (
                <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600 ring-1 ring-slate-900/5 sm:inline">
                  {tradesUsageLabel}
                </span>
              )}
              <Button
                type="button"
                onClick={onAddTrade}
                disabled={addTradeDisabled}
                title={addTradeDisabled ? addTradeDisabledReason : undefined}
                className="h-9 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {t("filters.addTrade")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max min-w-full items-center gap-0.5 rounded-lg bg-slate-200/50 p-1">
            {STATUS_ROW.filter(({ key }) => {
              if (filters.type === "PUT" && key === "CALLED_AWAY") return false;
              if (filters.type === "CALL" && key === "ASSIGNED") return false;
              return true;
            }).map(({ key, labelKey, Icon }) => {
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
                      ? "animate-pill-pop bg-white text-slate-950 shadow-sm ring-1 ring-slate-300/80 scale-[1.02]"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  <Icon className={iconSm} strokeWidth={iconStroke} aria-hidden />
                  {t(`filters.status.${labelKey}`)}
                </button>
              );
            })}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={applySinceLastMonth}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition ${
                filters.dateRangeType === "1M"
                  ? PILL_ACTIVE
                  : PILL_IDLE
              }`}
            >
              {t("filters.sinceLastMonth")}
            </button>
            <div
              className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 ${
                filters.dateRangeType === "CUSTOM"
                  ? "border-slate-400 bg-slate-100 ring-1 ring-slate-300/80"
                  : "border-slate-300 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => apply({ dateRangeType: "CUSTOM" })}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  filters.dateRangeType === "CUSTOM"
                    ? "text-slate-950"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {t("filters.custom")}
              </button>
              <span className="text-slate-300" aria-hidden>
                |
              </span>
              <DatePicker
                value={filters.startDate}
                placeholder={tCommon("date.from")}
                emphasized={filters.dateRangeType === "CUSTOM"}
                aria-label={tCommon("date.from")}
                onChange={(startDate) =>
                  apply({
                    dateRangeType: "CUSTOM",
                    startDate,
                  })
                }
              />
              <span className="text-xs font-medium text-slate-600">–</span>
              <DatePicker
                value={filters.endDate}
                placeholder={tCommon("date.to")}
                emphasized={filters.dateRangeType === "CUSTOM"}
                aria-label={tCommon("date.to")}
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
