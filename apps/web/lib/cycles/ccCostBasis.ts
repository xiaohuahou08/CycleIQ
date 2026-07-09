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
  ccPremiumRealized: number;
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

/** Shares still available to write new OPEN covered calls for a ticker. */
export function availableCcSharesForTicker(
  trades: Trade[],
  ticker: string,
  options?: { excludeTradeId?: string }
): number {
  const sym = ticker.toUpperCase().trim();
  const tt = trades.filter((t) => t.ticker.toUpperCase() === sym);
  const assignedPuts = tt.filter(
    (t) =>
      t.option_type === "PUT" &&
      (t.status === "ASSIGNED" || t.status === "CALLED_AWAY") &&
      assignmentStockBasisPerShare(t) != null
  );
  if (assignedPuts.length === 0) return 0;

  const assignedShares = assignedPuts.reduce((s, t) => s + t.contracts * 100, 0);
  const calledAwayShares = tt
    .filter((t) => t.option_type === "CALL" && t.status === "CALLED_AWAY")
    .reduce((s, t) => s + t.contracts * 100, 0);
  const exclude = options?.excludeTradeId;
  const openCcShares = tt
    .filter(
      (t) =>
        t.option_type === "CALL" &&
        t.status === "OPEN" &&
        t.id !== exclude
    )
    .reduce((s, t) => s + t.contracts * 100, 0);

  return Math.max(0, assignedShares - calledAwayShares - openCcShares);
}

/** Resolve cycle_id from the trade or its rolled_from chain. */
export function resolveTradeCycleId(trade: Trade, trades: Trade[]): string | undefined {
  if (trade.cycle_id) return trade.cycle_id;
  const byId = new Map(trades.map((t) => [t.id, t]));
  const seen = new Set<string>();
  let currentId: string | null | undefined = trade.rolled_from_id;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const parent = byId.get(currentId);
    if (!parent) break;
    if (parent.cycle_id) return parent.cycle_id;
    currentId = parent.rolled_from_id;
  }
  return undefined;
}

/** Tickers with stock still held after CSP assignment (shares available for CC). */
export function tickersWithCcStock(trades: Trade[]): string[] {
  const tickers = new Set<string>();
  for (const t of trades) {
    if (availableCcSharesForTicker(trades, t.ticker) > 0) {
      tickers.add(t.ticker.toUpperCase());
    }
  }
  return Array.from(tickers).sort((a, b) => a.localeCompare(b));
}

/** Map ticker → cycle_id for wheels with assignable stock (most recent ASSIGNED put). */
export function assignedCycleIdByTicker(trades: Trade[]): Record<string, string> {
  const map: Record<string, string> = {};
  const puts = trades
    .filter((t) => t.option_type === "PUT" && t.status === "ASSIGNED")
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date));

  for (const put of puts) {
    const ticker = put.ticker.toUpperCase();
    if (availableCcSharesForTicker(trades, ticker) <= 0) continue;
    const cycleId = resolveTradeCycleId(put, trades);
    if (cycleId) map[ticker] = cycleId;
  }
  return map;
}

export function assignedCycleIdForTicker(trades: Trade[], ticker: string): string | undefined {
  return assignedCycleIdByTicker(trades)[ticker.toUpperCase().trim()];
}

function scopeTradesForTrade(trade: Trade, allTrades: Trade[]): Trade[] {
  const cycleId = resolveTradeCycleId(trade, allTrades);
  if (cycleId) {
    return allTrades.filter((t) => t.cycle_id === cycleId);
  }
  const sym = trade.ticker.toUpperCase();
  return allTrades.filter((t) => t.ticker.toUpperCase() === sym);
}

/**
 * Effective stock cost per share for display — ASSIGNED CSP basis or CC wheel
 * cost after premium reduction (OPEN + terminal CC legs).
 */
export function effectiveStockCostPerShareForTrade(
  trade: Trade,
  allTrades: Trade[]
): number | null {
  if (trade.option_type === "PUT" && trade.status === "ASSIGNED") {
    return assignmentStockBasisPerShare(trade);
  }
  if (trade.option_type !== "CALL") return null;

  const scope = scopeTradesForTrade(trade, allTrades);
  const assignedPuts = scope.filter(
    (t) =>
      t.option_type === "PUT" &&
      t.status === "ASSIGNED" &&
      assignmentStockBasisPerShare(t) != null
  );
  if (assignedPuts.length === 0) return null;

  const assignedShares = assignedPuts.reduce((s, t) => s + t.contracts * 100, 0);
  if (assignedShares <= 0) return null;

  let basisWeighted = 0;
  for (const put of assignedPuts) {
    const basis = assignmentStockBasisPerShare(put);
    if (basis == null) continue;
    basisWeighted += basis * put.contracts * 100;
  }
  const weightedInitial = basisWeighted / assignedShares;
  const ccPremium = effectiveCcPremiumForBasis(scope);
  const reductionPerShare = ccPremium / assignedShares;
  return Math.max(0, weightedInitial - reductionPerShare);
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

/**
 * CC premium that lowers effective stock cost — includes OPEN legs (premium collected
 * on sale) plus terminal legs. Excludes CALLED_AWAY (shares exited).
 */
export function effectiveCcPremiumForBasis(trades: Trade[]): number {
  return trades
    .filter(
      (t) =>
        t.option_type === "CALL" &&
        (t.status === "OPEN" ||
          t.status === "EXPIRED" ||
          t.status === "CLOSED" ||
          t.status === "ROLLED")
    )
    .reduce((sum, t) => sum + netLegCashflow(t), 0);
}

function tradesScopedToWheel(wheelTrades: Trade[], allTrades: Trade[]): Trade[] {
  const tickers = new Set(wheelTrades.map((t) => t.ticker.toUpperCase()));
  const cycleIds = new Set<string>();
  for (const t of [...wheelTrades, ...allTrades]) {
    if (t.cycle_id && tickers.has(t.ticker.toUpperCase())) {
      cycleIds.add(t.cycle_id);
    }
  }
  if (cycleIds.size === 0) return wheelTrades;
  const scoped = allTrades.filter((t) => t.cycle_id != null && cycleIds.has(t.cycle_id));
  return scoped.length > 0 ? scoped : wheelTrades;
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

  const ccPremiumTotal = effectiveCcPremiumForBasis(wheelTrades);
  const ccPremiumRealized = basisReducingCcPremium(wheelTrades);
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
    ccPremiumRealized,
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
    const scopedTrades = tradesScopedToWheel(wheel.trades, allTrades);
    const row = buildCcCostBasisRow(
      wheel.id,
      wheel.ticker,
      scopedTrades,
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
