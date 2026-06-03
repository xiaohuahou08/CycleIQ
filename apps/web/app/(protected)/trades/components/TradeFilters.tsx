"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "@/app/components/DatePicker";

export interface FilterState {
  type: string;
  status: string;
  search: string;
  dateRangeType?: "TODAY" | "1M" | "CUSTOM";
  startDate?: string;
  endDate?: string;
}

const icBase = "h-4 w-4 shrink-0";

function SvgFrame(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${icBase} ${props.className ?? ""}`}
      aria-hidden
    >
      {props.children}
    </svg>
  );
}

function IconSearchSm({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.35-3.35" />
    </SvgFrame>
  );
}

function IconCircleDot({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </SvgFrame>
  );
}

function IconChartLine({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path d="M3 17l7-8 5 6 8-13" />
      <path d="M21 17H3" />
    </SvgFrame>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v6l4 2" />
    </SvgFrame>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path d="M5 13l4 4L19 7" />
    </SvgFrame>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4m8-4v4M4 11h16" />
    </SvgFrame>
  );
}

function IconArrowDown({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path d="M12 5v14" />
      <path d="M6 17l6 6 6-6" />
    </SvgFrame>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path d="M21 12a9 9 0 10-9 9.25" />
      <path d="M21 3v9h-9" />
    </SvgFrame>
  );
}

function IconTrendUp({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 7h4v4" />
    </SvgFrame>
  );
}

const STATUS_ROW: ReadonlyArray<{
  key: string;
  label: string;
  Icon: ({ className }: { className?: string }) => React.JSX.Element;
}> = [
  { key: "OPEN", label: "Open", Icon: IconClock },
  { key: "CLOSED", label: "Closed", Icon: IconCheck },
  { key: "EXPIRED", label: "Expired", Icon: IconCalendar },
  { key: "ASSIGNED", label: "Assigned", Icon: IconArrowDown },
  { key: "CALLED_AWAY", label: "Away", Icon: IconTrendUp },
  { key: "ROLLED", label: "Rolled", Icon: IconRefresh },
];

interface TradeFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  tickerSuggestions?: string[];
  onAddTrade?: () => void;
  /** When wrapped in outer card (rounded border/shadow handled by parent) */
  embedded?: boolean;
}

export default function TradeFilters({
  onFilterChange,
  tickerSuggestions = [],
  onAddTrade,
  embedded = false,
}: TradeFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    type: "PUT",
    status: "OPEN",
    search: "",
    dateRangeType: "TODAY",
  });

  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Fire initial filter state on mount so the parent always reflects the default (CSP + OPEN).
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  useEffect(() => {
    onFilterChangeRef.current({ type: "PUT", status: "OPEN", search: "", dateRangeType: "TODAY" });
  }, []);

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
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange(next);
  };

  const switchOptionType = (type: "PUT" | "CALL") => {
    if (filters.type === type) return;
    let status = filters.status;
    // Status tabs differ by strategy — reset incompatible selection.
    if (type === "PUT" && status === "CALLED_AWAY") status = "OPEN";
    if (type === "CALL" && status === "ASSIGNED") status = "OPEN";
    apply({
      type,
      status,
      dateRangeType: status === "OPEN" ? "TODAY" : "1M",
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
        <div
          ref={searchWrapRef}
          className="relative w-36 shrink-0"
        >
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
            <IconSearchSm />
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
            <IconCircleDot className={filters.type === "PUT" ? "text-white" : "text-gray-500"} />
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
            <IconChartLine className={filters.type === "CALL" ? "text-white" : "text-gray-500"} />
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
                    dateRangeType: key === "OPEN" ? "TODAY" : "1M",
                  })
                }
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold capitalize transition ${
                  active
                    ? "border border-transparent bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-gray-100"
                    : "border border-transparent bg-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="text-current" />
                {label}
              </button>
            );
          })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-l border-gray-200 pl-3">
          <button
            type="button"
            onClick={() => apply({ dateRangeType: "TODAY" })}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              filters.dateRangeType === "TODAY"
                ? "bg-gray-900 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => apply({ dateRangeType: "1M" })}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              filters.dateRangeType === "1M"
                ? "bg-gray-900 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Last month
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
