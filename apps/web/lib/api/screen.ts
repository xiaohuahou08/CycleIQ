import { apiFetch } from "@/lib/api/base";
import type { ScreenerConfigApi } from "@/lib/api/preferences";

export interface ScreenCandidate {
  rank: number | null;
  symbol: string;
  mode: "put" | "call" | string;
  strike: number;
  expiry: string;
  dte: number;
  spot: number;
  bid: number;
  ask: number;
  mid: number;
  spread_ratio: number;
  net_premium_per_share: number;
  gross_premium_per_share: number;
  fee_per_share: number;
  period_net_return: number;
  annualized_net_return: number;
  breakeven: number;
  net_assignment_discount_pct: number | null;
  implied_volatility: number | null;
  term_matched_rv: number | null;
  iv_rv_ratio: number | null;
  iv_minus_rv: number | null;
  open_interest: number | null;
  avg_cost?: number | null;
  open_shares?: number | null;
  max_new_contracts?: number | null;
  contract_id: string;
}

export interface ScreenScanResult {
  puts: ScreenCandidate[];
  calls: ScreenCandidate[];
  rejected_summary: {
    put: Record<string, number>;
    call: Record<string, number>;
  };
  scanned_at: string;
  config_used: ScreenerConfigApi;
  holdings: { symbol: string; open_shares: number; avg_cost: number }[];
  advisory_only: boolean;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    const detail = data.error || data.message;
    if (detail) return detail;
  } catch {
    // ignore
  }
  return `${fallback}: ${res.status}`;
}

export async function runScreenScan(
  token: string,
  opts?: { config?: ScreenerConfigApi; modes?: Array<"put" | "call"> }
): Promise<ScreenScanResult> {
  const res = await apiFetch(`/api/screen/scan`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      config: opts?.config,
      modes: opts?.modes,
    }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Screen scan failed"));
  return (await res.json()) as ScreenScanResult;
}
