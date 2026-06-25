/** Public marketing site URL — set NEXT_PUBLIC_SITE_URL in production (e.g. https://cycleiq.app). */
export const SITE_NAME = "CycleIQ";
export const SITE_TAGLINE = "Wheel Strategy Tracker";

export const DEFAULT_DESCRIPTION =
  "Track cash-secured puts and covered calls as full wheel cycles. Log trades, visualize CSP → assignment → CC lifecycles, and monitor premium, realized P&L, and cost basis — no spreadsheets.";

export const DEFAULT_KEYWORDS = [
  "wheel strategy",
  "options wheel",
  "cash secured put",
  "covered call",
  "CSP tracker",
  "options trading journal",
  "wheel cycle",
  "premium tracking",
  "options P&L",
] as const;

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
