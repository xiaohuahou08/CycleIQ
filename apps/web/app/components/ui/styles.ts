/** Shared UI class constants for app + marketing surfaces. */

export const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

export const BTN_ACCENT =
  "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const CARD_BASE =
  "rounded-2xl border border-border bg-surface shadow-sm ring-1 ring-slate-900/[0.04]";

export const PILL_ACTIVE =
  "animate-pill-pop bg-slate-900 text-white shadow-sm scale-[1.02]";

export const PILL_IDLE =
  "border border-slate-300 bg-white text-slate-700 transition-all duration-150 hover:border-slate-400 hover:bg-slate-50";

/** KPI / chart accent bar classes mapped to semantic tokens */
export const KPI_ACCENT = {
  capital: "bg-accent-muted",
  premium: "bg-accent-muted",
  profit: "bg-profit",
  loss: "bg-loss",
  ratio: "bg-chart-blue",
  count: "bg-chart-violet",
  warning: "bg-warning",
} as const;

/** Trade / position status badge colors */
export const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  CLOSED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  EXPIRED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  ASSIGNED: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  CALLED_AWAY: "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
  ROLLED: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
};

export function profitLossClass(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-slate-800";
}
