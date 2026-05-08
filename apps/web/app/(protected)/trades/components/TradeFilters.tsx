"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface FilterState {
  type: string;
  status: string;
  search: string;
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

function IconFunnel({ className }: { className?: string }) {
  return (
    <SvgFrame className={className}>
      <path
        strokeLinejoin="round"
        d="M3 7h18l-7 12v7l-4 2v-9L3 7z"
      />
    </SvgFrame>
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
  totalCount: number;
  filteredCount: number;
  tickerSuggestions?: string[];
  onAddTrade?: () => void;
  /** When wrapped in outer card (rounded border/shadow handled by parent) */
  embedded?: boolean;
}

export default function TradeFilters({
  onFilterChange,
  totalCount,
  filteredCount,
  tickerSuggestions = [],
  onAddTrade,
  embedded = false,
}: TradeFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    type: "ALL",
    status: "OPEN",
    search: "",
  });

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
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange(next);
  };

  const reset = () => {
    const blank: FilterState = {
      type: "ALL",
      status: "OPEN",
      search: "",
    };
    setFilters(blank);
    setSuggestOpen(false);
    onFilterChange(blank);
  };

  const hasFilters =
    filters.type !== "ALL" ||
    filters.status !== "ALL" ||
    filters.search.trim() !== "";

  const toggleCsp = () => {
    apply({ type: filters.type === "PUT" ? "ALL" : "PUT" });
  };

  const toggleCc = () => {
    apply({ type: filters.type === "CALL" ? "ALL" : "CALL" });
  };

  const shell = embedded
    ? "bg-white"
    : "rounded-xl border border-gray-200 bg-white shadow-sm";

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white">
          <IconFunnel className="text-white" />
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-[18px] font-bold leading-none tracking-tight text-gray-900">
            Positions
          </h1>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-medium tabular-nums text-gray-600">
            {filteredCount !== totalCount
              ? `${filteredCount}/${totalCount}`
              : filteredCount}
          </span>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {onAddTrade && (
            <button
              type="button"
              onClick={onAddTrade}
              className="rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] hover:bg-gray-800"
            >
              + Add trade
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
        <div
          ref={searchWrapRef}
          className="relative min-w-[min(100%,240px)] flex-[1_1_200px]"
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
        <div className="min-w-[360px] flex-1 overflow-x-auto">
          <div className="flex w-max min-w-full items-center gap-1 rounded-full bg-[#eef0f4] p-1">
          {STATUS_ROW.map(({ key, label, Icon }) => {
            const active = filters.status === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => apply({ status: key })}
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
          <div className="min-w-2 flex-1" aria-hidden />
          <button
            type="button"
            onClick={() => apply({ status: "ALL" })}
            className={`mr-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition ${
              filters.status === "ALL"
                ? "border border-gray-200 bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-gray-100"
                : "border border-transparent bg-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <IconFunnel />
            All
          </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
