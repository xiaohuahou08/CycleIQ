export const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0";

export const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm active:translate-y-0";

export type MarketingPage = "home" | "pricing";

/** Shared horizontal padding and vertical rhythm for marketing pages. */
export const MARKETING_PAGE_PAD = "mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16";

export const MARKETING_NAV_LINK =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

export function marketingNavLinkClass(active: boolean): string {
  return active
    ? `${MARKETING_NAV_LINK} bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80`
    : `${MARKETING_NAV_LINK} text-slate-600 hover:text-slate-900`;
}

