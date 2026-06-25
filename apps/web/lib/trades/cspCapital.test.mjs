import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  capitalBudgetError,
  capitalUtilizationPct,
  computeTotalCapitalInvested,
  cspNotional,
  sumOpenCspNotional,
} from "./cspCapital.ts";

const today = "2026-06-03";

function put(overrides) {
  return {
    id: "p1",
    ticker: "AAPL",
    option_type: "PUT",
    strike: 100,
    expiry: "2026-07-01",
    trade_date: "2026-05-01",
    premium: 2,
    contracts: 1,
    status: "OPEN",
    ...overrides,
  };
}

describe("cspNotional", () => {
  it("computes strike × contracts × 100", () => {
    assert.equal(cspNotional(150, 2), 30000);
  });
});

describe("sumOpenCspNotional", () => {
  it("sums only open puts not past expiry", () => {
    const trades = [
      put({ id: "a", strike: 100, contracts: 1 }),
      put({ id: "b", option_type: "CALL", strike: 110, contracts: 1 }),
      put({ id: "c", status: "CLOSED" }),
      put({ id: "d", expiry: "2026-01-01" }),
    ];
    assert.equal(sumOpenCspNotional(trades, { today }), 10000);
  });
});

describe("computeTotalCapitalInvested", () => {
  it("includes assigned stock cost basis", () => {
    const trades = [
      put({ id: "a", status: "ASSIGNED", stock_cost_basis_per_share: 50, contracts: 1 }),
      put({ id: "b", strike: 40, contracts: 1, status: "OPEN" }),
    ];
    const total = computeTotalCapitalInvested(trades, { today });
    assert.equal(total, 5000 + 4000);
  });
});

describe("capitalUtilizationPct", () => {
  it("returns percentage of budget used", () => {
    assert.equal(capitalUtilizationPct(7500, 10000), 75);
  });
});

describe("capitalBudgetError", () => {
  it("returns null when new leg fits budget", () => {
    const err = capitalBudgetError([put({ strike: 50, contracts: 1 })], 10000, {
      optionType: "PUT",
      status: "OPEN",
      strike: 40,
      contracts: 1,
      expiry: "2026-08-01",
    });
    assert.equal(err, null);
  });

  it("returns message when over budget", () => {
    const err = capitalBudgetError([put({ strike: 90, contracts: 10 })], 10000, {
      optionType: "PUT",
      status: "OPEN",
      strike: 50,
      contracts: 5,
      expiry: "2026-08-01",
    });
    assert.match(err ?? "", /exceeds your capital budget/);
    assert.match(err ?? "", /% of budget/);
  });
});
