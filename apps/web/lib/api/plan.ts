const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface PlanUsage {
  plan: string;
  plan_label: string;
  price_usd: number | null;
  trades_this_month: number;
  trades_limit: number | null;
  trades_remaining: number | null;
  limit_reached: boolean;
  period_start: string;
  period_end: string;
}

export async function fetchPlanUsage(token: string): Promise<PlanUsage> {
  const res = await fetch(`${API_BASE}/api/me/plan`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load plan usage (${res.status})`);
  }
  return (await res.json()) as PlanUsage;
}
