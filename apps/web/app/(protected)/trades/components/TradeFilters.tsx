"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface FilterState {
  type: string;
  status: string;
  search: string;
  dateRangeType?: "1M" | "CUSTOM";
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
    type: "PUT",
    status: "OPEN",
    search: "",
    dateRangeType: "1M",
  });

  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Fire initial filter state on mount so the parent always reflects the default (CSP + OPEN).
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  useEffect(() => {
    onFilterChangeRef.current({ type: "PUT", status: "OPEN", search: "", dateRangeType: "1M" });
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

  const handleDateRangeTypeChange = (type: "1M" | "CUSTOM") => {
    apply({ dateRangeType: type });
  };

  const handleDateChange = (key: "startDate" | "endDate", val: string) => {
    apply({ [key]: val || undefined });
  };

  const toggleCsp = () => {
    if (filters.type === "PUT") return;
    apply({ type: "PUT" });
  };

  const toggleCc = () => {
    if (filters.type === "CALL") return;
    apply({ type: "CALL" });
  };

  const shell = embedded
    ? "bg-transparent"
    : "glass-card p-0 overflow-hidden";

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-[#111417]/50 border-b border-[#2D3439]/60">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6]">
          <IconFunnel className="text-current" />
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-[18px] font-bold leading-none tracking-tight text-[#E1E2E7]">
            Positions
          </h1>
          <span className="rounded-md bg-[#1D2023] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#94A3B8] border border-[#2D3439]">
            {filteredCount !== totalCount
              ? `${filteredCount}/${totalCount}`
              : filteredCount}
          </span>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {onAddTrade && filters.status !== "CALLED_AWAY" && (
            <button
              type="button"
              onClick={onAddTrade}
              className="rounded-xl action-gradient px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8B5CF6]/20 transition-all duration-200 hover:brightness-110"
            >
              + Add trade
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div
          ref={searchWrapRef}
          className="relative w-40 shrink-0"
        >
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
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
            className="w-full rounded-xl border border-[#2D3439] bg-[#111417] py-2 pl-10 pr-4 text-[13px] text-[#E1E2E7] placeholder:text-slate-500 focus:border-[#8B5CF6]/50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/35 transition-all duration-200"
          />
          {suggestOpen && matchingTickers.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-48 overflow-auto rounded-xl border border-[#2D3439] bg-[#15191C]/98 backdrop-blur-md py-1.5 text-[13px] shadow-2xl text-[#E1E2E7]"
              role="listbox"
            >
              {matchingTickers.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className="w-full px-3.5 py-2 text-left text-[13px] font-bold uppercase text-[#E1E2E7] hover:bg-[#1D2023] transition-colors"
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
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition-all duration-150 ${
              filters.type === "PUT"
                ? "action-gradient text-white shadow-lg shadow-[#8B5CF6]/20"
                : "border border-[#2D3439] bg-[#111417] text-[#94A3B8] hover:bg-[#1D2023] hover:text-[#E1E2E7]"
            }`}
          >
            <IconCircleDot className={filters.type === "PUT" ? "text-white animate-pulse" : "text-[#94A3B8]"} />
            CSP
          </button>
          <button
            type="button"
            onClick={toggleCc}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition-all duration-150 ${
              filters.type === "CALL"
                ? "action-gradient text-white shadow-lg shadow-[#8B5CF6]/20"
                : "border border-[#2D3439] bg-[#111417] text-[#94A3B8] hover:bg-[#1D2023] hover:text-[#E1E2E7]"
            }`}
          >
            <IconChartLine className={filters.type === "CALL" ? "text-white animate-pulse" : "text-[#94A3B8]"} />
            CC
          </button>
        </div>
        <div className="min-w-[360px] flex-1 overflow-x-auto">
          <div className="flex w-max min-w-full items-center gap-1 rounded-full bg-[#111417] border border-[#2D3439] p-1">
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
                onClick={() => apply({ status: key })}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all duration-150 ${
                  active
                    ? "bg-[#1D2023] text-[#8B5CF6] border border-[#2D3439] shadow-inner font-bold"
                    : "border border-transparent bg-transparent text-[#94A3B8] hover:text-[#E1E2E7]"
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
            onClick={() => apply({ status: "ALL", dateRangeType: "1M" })}
            className={`mr-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
              filters.status === "ALL"
                ? "bg-[#1D2023] text-[#8B5CF6] border border-[#2D3439] shadow-inner font-bold"
                : "border border-transparent bg-transparent text-[#94A3B8] hover:text-[#E1E2E7]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] leading-none text-current" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>history</span>
            History
          </button>
          </div>
        </div>
      </div>

      {filters.status === "ALL" && (
        <div className="flex flex-wrap items-center gap-4 border-t border-[#2D3439]/60 bg-[#111417]/40 px-5 py-3 transition-all duration-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Time Range:</span>
            <div className="inline-flex rounded-lg border border-[#2D3439] bg-[#111417] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleDateRangeTypeChange("1M")}
                className={`rounded-md px-3 py-1 font-bold text-[11px] uppercase tracking-wide transition-all duration-150 ${
                  filters.dateRangeType === "1M"
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                    : "text-[#94A3B8] hover:text-[#E1E2E7]"
                }`}
              >
                Last 1 Month
              </button>
              <button
                type="button"
                onClick={() => handleDateRangeTypeChange("CUSTOM")}
                className={`rounded-md px-3 py-1 font-bold text-[11px] uppercase tracking-wide transition-all duration-150 ${
                  filters.dateRangeType === "CUSTOM"
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                    : "text-[#94A3B8] hover:text-[#E1E2E7]"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {filters.dateRangeType === "CUSTOM" && (
            <div className="flex items-center gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">From</span>
                <input
                  type="date"
                  value={filters.startDate ?? ""}
                  onChange={(e) => handleDateChange("startDate", e.target.value)}
                  className="rounded-xl border border-[#2D3439] bg-[#111417] px-2.5 py-1 text-xs text-[#E1E2E7] focus:border-[#8B5CF6]/50 focus:outline-none transition-all duration-200"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">To</span>
                <input
                  type="date"
                  value={filters.endDate ?? ""}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                  className="rounded-xl border border-[#2D3439] bg-[#111417] px-2.5 py-1 text-xs text-[#E1E2E7] focus:border-[#8B5CF6]/50 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
