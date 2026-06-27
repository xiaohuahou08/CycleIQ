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
