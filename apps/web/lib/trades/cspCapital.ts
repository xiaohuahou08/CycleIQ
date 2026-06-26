import type { Trade } from "@/lib/api/trades";
import {
  assignmentStockBasisPerShare,
  basisReducingCcPremium,
  netLegCashflow,
} from "@/lib/cycles/ccCostBasis";

const PNL_STATUSES = new Set(["CLOSED", "EXPIRED", "ROLLED", "CALLED_AWAY", "ASSIGNED"]);

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

/** Effective USD cost of assigned stock still held (matches dashboard). */
export function computeStockEffectiveCost(trades: Trade[]): number {
  const byTicker = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byTicker.get(t.ticker) ?? [];
    list.push(t);
    byTicker.set(t.ticker, list);
  }

  let total = 0;
  for (const tt of byTicker.values()) {
    const assignedPuts = tt.filter(
      (t) =>
        t.option_type === "PUT" &&
        (t.status === "ASSIGNED" || t.status === "CALLED_AWAY") &&
        assignmentStockBasisPerShare(t) != null
    );
    if (assignedPuts.length === 0) continue;

    const assignedShares = assignedPuts.reduce((s, t) => s + t.contracts * 100, 0);
    if (assignedShares <= 0) continue;

    let basisWeighted = 0;
    for (const put of assignedPuts) {
      const basis = assignmentStockBasisPerShare(put);
      if (basis == null) continue;
      basisWeighted += basis * put.contracts * 100;
    }
    const weightedInitialBasis = basisWeighted / assignedShares;
    const ccReductionNet = basisReducingCcPremium(tt);
    const ccReductionPerShare = ccReductionNet / assignedShares;
    const effectiveBasisPerShare = Math.max(0, weightedInitialBasis - ccReductionPerShare);

    const calledAwayShares = tt
      .filter((t) => t.option_type === "CALL" && t.status === "CALLED_AWAY")
      .reduce((s, t) => s + t.contracts * 100, 0);
    const remainingShares = assignedShares - calledAwayShares;
    if (remainingShares > 0) {
      total += effectiveBasisPerShare * remainingShares;
    }
  }
  return total;
}

export function computeTotalCapitalInvested(
  trades: Trade[],
  options?: { excludeTradeId?: string; today?: string }
): number {
  const today = options?.today ?? todayIso();
  const exclude = options?.excludeTradeId;
  const working = exclude ? trades.filter((t) => t.id !== exclude) : trades;
  return sumOpenCspNotional(working, { today }) + computeStockEffectiveCost(working);
}

function stockSalePnl(trades: Trade[]): number {
  const byTicker = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byTicker.get(t.ticker) ?? [];
    list.push(t);
    byTicker.set(t.ticker, list);
  }

  let extra = 0;
  for (const tt of byTicker.values()) {
    const assignedPuts = tt.filter(
      (t) =>
        t.option_type === "PUT" &&
        (t.status === "ASSIGNED" || t.status === "CALLED_AWAY") &&
        assignmentStockBasisPerShare(t) != null
    );
    if (assignedPuts.length === 0) continue;

    const assignedShares = assignedPuts.reduce((s, t) => s + t.contracts * 100, 0);
    if (assignedShares <= 0) continue;

    let basisWeighted = 0;
    for (const put of assignedPuts) {
      const basis = assignmentStockBasisPerShare(put);
      if (basis == null) continue;
      basisWeighted += basis * put.contracts * 100;
    }
    const weightedInitialBasis = basisWeighted / assignedShares;

    for (const cc of tt.filter((t) => t.option_type === "CALL" && t.status === "CALLED_AWAY")) {
      extra += (cc.strike - weightedInitialBasis) * cc.contracts * 100;
    }
  }
  return extra;
}

/** Cumulative realized P&L across all trades (matches dashboard). */
export function portfolioRealizedPnl(trades: Trade[]): number {
  const optionPnl = trades
    .filter((t) => PNL_STATUSES.has(t.status))
    .reduce((sum, t) => sum + netLegCashflow(t), 0);
  return optionPnl + stockSalePnl(trades);
}

export function effectiveCapitalPool(budget: number, trades: Trade[]): number {
  return budget + portfolioRealizedPnl(trades);
}

export function capitalUtilizationPct(invested: number, budget: number): number {
  if (budget <= 0) return 0;
  return (invested / budget) * 100;
}

export function capitalBudgetError(
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

  const before = computeTotalCapitalInvested(trades, { excludeTradeId });
  const baseWithoutLeg = computeTotalCapitalInvested(trades, { excludeTradeId });
  const after = baseWithoutLeg + cspNotional(leg.strike, leg.contracts);
  const pool = effectiveCapitalPool(budget, trades);

  if (after <= pool + 1e-6) return null;
  if (after <= before + 1e-6) return null;

  const over = after - pool;
  const pct = capitalUtilizationPct(after, pool);
  return `Total capital invested $${after.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${pct.toFixed(0)}% of total capital) exceeds your available capital of $${pool.toLocaleString("en-US", { maximumFractionDigits: 0 })} (over by $${over.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
}

/** @deprecated use capitalBudgetError */
export const cspBudgetError = capitalBudgetError;
