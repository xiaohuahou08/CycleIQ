/** Public marketing site URL — set NEXT_PUBLIC_SITE_URL in production (e.g. https://cycleiq.app). */
export const SITE_NAME = "CycleIQ";
export const SITE_TAGLINE = "Wheel Strategy Tracker";

/** Public support / legal contact — override with NEXT_PUBLIC_SUPPORT_EMAIL in production. */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@cycleiq.app";

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
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");
  const vercelBranch = process.env.VERCEL_BRANCH_URL?.trim()?.replace(/\/$/, "");
  const vercelDeploy = process.env.VERCEL_URL?.trim()?.replace(/\/$/, "");
  const vercelHost = vercelBranch || vercelDeploy;

  // Production: prefer explicit canonical domain.
  if (process.env.VERCEL_ENV === "production" && configured) {
    return configured;
  }

  // Preview / per-deployment: use Vercel host (branch URL is stable per git branch).
  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  if (configured) {
    return configured;
  }

  return "http://localhost:3000";
}
