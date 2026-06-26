import type { Trade } from "@/lib/api/trades";

export interface WheelSummary {
  id: string;
  ticker: string;
  state: string;
  created_at?: string | null;
  trades: Trade[];
}

export interface CcCostBasisRow {
  wheelId: string;
  ticker: string;
  subtitle: string;
  initialCost: number;
  currentCost: number;
  ccPremiumTotal: number;
  assignedShares: number;
  ccPositions: number;
  reductionPct: number;
  recentTradeDate: number;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

/** Net cashflow for a single trade leg (matches backend `_realized_cashflow`). */
export function netLegCashflow(t: Trade): number {
  const gross = t.premium * t.contracts * 100;
  const buyback = (t.buyback_cost_per_share ?? 0) * t.contracts * 100;
  const commission = t.commission_fee ?? 0;
  const assignFees = t.fees_on_assignment ?? 0;
  return gross - buyback - commission - assignFees;
}

/** CSP assignment cost per share (stored or computed — mirrors backend). */
export function assignmentStockBasisPerShare(put: Trade): number | null {
  if (put.option_type !== "PUT") return null;
  if (
    put.stock_cost_basis_per_share != null &&
    Number.isFinite(put.stock_cost_basis_per_share)
  ) {
    return put.stock_cost_basis_per_share;
  }
  const shares = put.contracts * 100;
  if (shares <= 0) return null;
  const openFee = put.commission_fee ?? 0;
  const assignFee = put.fees_on_assignment ?? 0;
  const priorRoll = put.prior_roll_premium_per_share ?? 0;
  return put.strike - put.premium - priorRoll + (openFee + assignFee) / shares;
}

/**
 * Wheel total realized P&L: terminal option cashflows + stock gain/loss on call-away.
 * ROLLED legs are excluded — their net premium is already embedded in the assignment
 * put's `prior_roll_premium_per_share` (cost basis), so counting them again double-counts.
 */
export function wheelTotalNetPnl(legs: Trade[]): number {
  const optionLegs = legs.filter((t) => t.status !== "ROLLED");
  let total = optionLegs.reduce((sum, t) => sum + netLegCashflow(t), 0);

  const stockPuts = legs.filter(
    (t) =>
      t.option_type === "PUT" &&
      (t.status === "ASSIGNED" || t.status === "CALLED_AWAY")
  );
  const assignedShares = stockPuts.reduce((s, t) => s + t.contracts * 100, 0);
  if (assignedShares <= 0) return total;

  let basisWeighted = 0;
  for (const put of stockPuts) {
    const basis = assignmentStockBasisPerShare(put);
    if (basis == null) continue;
    basisWeighted += basis * put.contracts * 100;
  }
  const initialBasisPerShare = basisWeighted / assignedShares;

  for (const cc of legs.filter((t) => t.option_type === "CALL" && t.status === "CALLED_AWAY")) {
    const sharesCalled = cc.contracts * 100;
    total += (cc.strike - initialBasisPerShare) * sharesCalled;
  }

  return total;
}

export function isCompletedWheel(state: string): boolean {
  return state === "EXIT" || state === "CSP_CLOSED";
}

export function assignedPutsWithBasis(trades: Trade[]): Trade[] {
  return trades.filter(
    (t) =>
      t.option_type === "PUT" &&
      t.status === "ASSIGNED" &&
      t.stock_cost_basis_per_share != null &&
      Number.isFinite(t.stock_cost_basis_per_share)
  );
}

/** CC legs that actually reduce held-stock basis (matches dashboard). */
export function basisReducingCcPremium(trades: Trade[]): number {
  return trades
    .filter(
      (t) =>
        t.option_type === "CALL" &&
        (t.status === "EXPIRED" || t.status === "CLOSED" || t.status === "ROLLED")
    )
    .reduce((sum, t) => sum + netLegCashflow(t), 0);
}

export function buildCcCostBasisRow(
  wheelId: string,
  ticker: string,
  wheelTrades: Trade[],
  assignDate?: string
): CcCostBasisRow | null {
  const assignedPuts = assignedPutsWithBasis(wheelTrades);
  if (assignedPuts.length === 0) return null;

  const assignedShares = assignedPuts.reduce((sum, t) => sum + t.contracts * 100, 0);
  if (assignedShares <= 0) return null;

  const weightedInitialCost =
    assignedPuts.reduce(
      (sum, t) => sum + (t.stock_cost_basis_per_share ?? 0) * t.contracts * 100,
      0
    ) / assignedShares;

  const ccPremiumTotal = basisReducingCcPremium(wheelTrades);
  const reductionPerShare = ccPremiumTotal / assignedShares;
  const currentCost = Math.max(0, weightedInitialCost - reductionPerShare);
  const reductionPct =
    weightedInitialCost > 0 ? (reductionPerShare / weightedInitialCost) * 100 : 0;

  const primaryPut = assignedPuts[assignedPuts.length - 1]!;
  const assignIso = assignDate ?? primaryPut.trade_date;
  const subtitle = `$${primaryPut.strike.toFixed(0)} CSP · ${fmtDate(assignIso)}`;

  const recentTradeDate = wheelTrades
    .map((t) => new Date(t.trade_date).getTime())
    .filter((ts) => Number.isFinite(ts))
    .sort((a, b) => b - a)[0];

  return {
    wheelId,
    ticker,
    subtitle,
    initialCost: weightedInitialCost,
    currentCost,
    ccPremiumTotal,
    assignedShares,
    ccPositions: wheelTrades.filter((t) => t.option_type === "CALL").length,
    reductionPct,
    recentTradeDate: recentTradeDate ?? 0,
  };
}

export function buildCcCostBasisRows(
  wheels: WheelSummary[],
  allTrades: Trade[]
): CcCostBasisRow[] {
  const rows: CcCostBasisRow[] = [];

  for (const wheel of wheels) {
    if (isCompletedWheel(wheel.state)) continue;
    const row = buildCcCostBasisRow(
      wheel.id,
      wheel.ticker,
      wheel.trades,
      wheel.created_at?.slice(0, 10)
    );
    if (row) rows.push(row);
  }

  const wheelTradeIds = new Set(wheels.flatMap((w) => w.trades.map((t) => t.id)));
  const orphanAssigned = assignedPutsWithBasis(allTrades).filter((t) => !wheelTradeIds.has(t.id));

  for (const put of orphanAssigned) {
    const scopeTrades =
      put.cycle_id != null
        ? allTrades.filter((t) => t.cycle_id === put.cycle_id)
        : [put];
    const row = buildCcCostBasisRow(
      `orphan:${put.id}`,
      put.ticker,
      scopeTrades,
      put.trade_date
    );
    if (row) rows.push(row);
  }

  return rows;
}
