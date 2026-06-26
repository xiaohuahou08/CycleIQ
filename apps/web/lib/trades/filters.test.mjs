import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, getClosedCycleIds, oneMonthAgoIso } from "./filters.ts";

function trade(overrides) {
  return {
    id: "t1",
    ticker: "UNH",
    option_type: "PUT",
    strike: 390,
    expiry: "2026-06-20",
    trade_date: "2026-04-01",
    premium: 2.5,
    contracts: 1,
    status: "CLOSED",
    ...overrides,
  };
}

describe("oneMonthAgoIso", () => {
  it("returns ISO date one calendar month earlier", () => {
    assert.equal(oneMonthAgoIso(new Date(2026, 5, 3)), "2026-05-03");
  });
});

describe("applyFilters", () => {
  const ref = new Date(2026, 5, 3); // 2026-06-03
  const closedCycles = new Set();

  it("keeps OPEN legs regardless of since-last-month cutoff", () => {
    const openOld = trade({
      id: "open-old",
      status: "OPEN",
      trade_date: "2025-01-01",
    });
    const closedOld = trade({
      id: "closed-old",
      status: "CLOSED",
      trade_date: "2025-01-01",
    });
    const filters = { type: "ALL", status: "ALL", search: "", dateRangeType: "1M" };
    const result = applyFilters([openOld, closedOld], filters, closedCycles, ref);
    assert.deepEqual(result.map((t) => t.id), ["open-old"]);
  });

  it("filters by type, status, and search", () => {
    const trades = [
      trade({ id: "a", option_type: "PUT", status: "OPEN", ticker: "UNH", notes: "wheel" }),
      trade({ id: "b", option_type: "CALL", status: "EXPIRED", ticker: "AAPL" }),
    ];
    const filters = { type: "PUT", status: "OPEN", search: "wheel", dateRangeType: "CUSTOM" };
    const result = applyFilters(trades, filters, closedCycles, ref);
    assert.deepEqual(result.map((t) => t.id), ["a"]);
  });

  it("applies custom date range", () => {
    const trades = [
      trade({ id: "in", trade_date: "2026-04-15" }),
      trade({ id: "out", trade_date: "2026-03-01" }),
    ];
    const filters = {
      type: "ALL",
      status: "ALL",
      search: "",
      dateRangeType: "CUSTOM",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    };
    const result = applyFilters(trades, filters, closedCycles, ref);
    assert.deepEqual(result.map((t) => t.id), ["in"]);
  });
});

describe("getClosedCycleIds", () => {
  it("marks cycles with call-away or no open legs as closed", () => {
    const trades = [
      trade({ id: "1", cycle_id: "c1", status: "CALLED_AWAY", option_type: "CALL" }),
      trade({ id: "2", cycle_id: "c2", status: "EXPIRED" }),
      trade({ id: "3", cycle_id: "c3", status: "OPEN" }),
    ];
    const closed = getClosedCycleIds(trades);
    assert.equal(closed.has("c1"), true);
    assert.equal(closed.has("c2"), true);
    assert.equal(closed.has("c3"), false);
  });
});
