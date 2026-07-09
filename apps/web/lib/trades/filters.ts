import type { Trade } from "@/lib/api/trades";
import type { FilterState } from "@/app/(protected)/trades/components/TradeFilters";

export function oneMonthAgoIso(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getClosedCycleIds(trades: Trade[]): Set<string> {
  const cycleTrades = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    if (!t.cycle_id) return acc;
    if (!acc[t.cycle_id]) acc[t.cycle_id] = [];
    acc[t.cycle_id].push(t);
    return acc;
  }, {});

  return new Set(
    Object.entries(cycleTrades)
      .filter(([, ts]) => {
        const hasCalledAway = ts.some(
          (t) => t.option_type === "CALL" && t.status === "CALLED_AWAY"
        );
        const hasOpen = ts.some((t) => t.status === "OPEN");
        const hasAssignedStock = ts.some(
          (t) => t.option_type === "PUT" && t.status === "ASSIGNED"
        );
        return hasCalledAway || (!hasOpen && !hasAssignedStock);
      })
      .map(([cycleId]) => cycleId)
  );
}

export function applyFilters(
  trades: Trade[],
  f: FilterState,
  _closedCycleIds: Set<string>,
  referenceDate: Date = new Date()
): Trade[] {
  return trades.filter((t) => {
    if (f.type !== "ALL" && t.option_type !== f.type) return false;

    if (f.status !== "ALL" && t.status !== f.status) return false;

    // Since last month: trade_date on or after one month ago; OPEN legs always listed.
    if (f.dateRangeType === "1M") {
      if (t.status !== "OPEN") {
        const since = oneMonthAgoIso(referenceDate);
        if (t.trade_date < since) return false;
      }
    } else if (f.dateRangeType === "CUSTOM") {
      if (f.startDate && t.trade_date < f.startDate) return false;
      if (f.endDate && t.trade_date > f.endDate) return false;
    }

    if (
      f.search &&
      !t.ticker.toLowerCase().includes(f.search.toLowerCase()) &&
      !(t.notes ?? "").toLowerCase().includes(f.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}
