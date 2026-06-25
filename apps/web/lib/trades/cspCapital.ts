import type { Trade } from "@/lib/api/trades";

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Cash-secured notional for one CSP leg: strike × contracts × 100. */
export function cspNotional(strike: number, contracts: number): number {
  return strike * contracts * 100;
}

export function isActiveOpenCsp(trade: Trade, today: string = todayIso()): boolean {
  return trade.option_type === "PUT" && trade.status === "OPEN" && trade.expiry >= today;
}

export function sumOpenCspNotional(
  trades: Trade[],
  options?: { excludeTradeId?: string; today?: string }
): number {
  const today = options?.today ?? todayIso();
  const exclude = options?.excludeTradeId;
  return trades
    .filter((t) => t.id !== exclude && isActiveOpenCsp(t, today))
    .reduce((sum, t) => sum + cspNotional(t.strike, t.contracts), 0);
}

/** Returns user-facing error message, or null if within budget. */
export function cspBudgetError(
  trades: Trade[],
  budget: number,
  leg: {
    optionType: "PUT" | "CALL";
    status: string;
    strike: number;
    contracts: number;
    expiry: string;
  },
  excludeTradeId?: string
): string | null {
  if (leg.optionType !== "PUT" || leg.status !== "OPEN") return null;
  const today = todayIso();
  if (leg.expiry < today) return null;

  const used = sumOpenCspNotional(trades, { excludeTradeId });
  const total = used + cspNotional(leg.strike, leg.contracts);
  if (total <= budget + 1e-6) return null;

  const over = total - budget;
  return `Open CSP cash requirement $${total.toLocaleString("en-US", { maximumFractionDigits: 0 })} exceeds your capital budget of $${budget.toLocaleString("en-US", { maximumFractionDigits: 0 })} (over by $${over.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
}
