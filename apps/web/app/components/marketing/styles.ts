export {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ACCENT,
  CARD_BASE,
  PILL_ACTIVE,
  PILL_IDLE,
} from "@/app/components/ui/styles";

export { Button, buttonVariants } from "@/components/ui/button";
export { Badge, badgeVariants } from "@/components/ui/badge";
export { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type MarketingPage = "home" | "pricing" | "contact";

export const MARKETING_LABEL_CLS = "text-sm font-medium text-slate-700";
export const MARKETING_INPUT_CLS =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
export const MARKETING_TEXTAREA_CLS = `${MARKETING_INPUT_CLS} min-h-[120px] resize-y`;

/** Shared horizontal padding and vertical rhythm for marketing pages. */
export const MARKETING_PAGE_PAD = "mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16";

export const MARKETING_NAV_LINK =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

export function marketingNavLinkClass(active: boolean): string {
  return active
    ? `${MARKETING_NAV_LINK} bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80`
    : `${MARKETING_NAV_LINK} text-slate-600 hover:text-slate-900`;
}
