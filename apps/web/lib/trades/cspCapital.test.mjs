import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cspBudgetError, cspNotional, sumOpenCspNotional } from "./cspCapital.ts";

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

describe("cspBudgetError", () => {
  it("returns null when new leg fits budget", () => {
    const err = cspBudgetError([put({ strike: 50, contracts: 1 })], 10000, {
      optionType: "PUT",
      status: "OPEN",
      strike: 40,
      contracts: 1,
      expiry: "2026-08-01",
    });
    assert.equal(err, null);
  });

  it("returns message when over budget", () => {
    const err = cspBudgetError([put({ strike: 90, contracts: 10 })], 10000, {
      optionType: "PUT",
      status: "OPEN",
      strike: 50,
      contracts: 5,
      expiry: "2026-08-01",
    });
    assert.match(err ?? "", /exceeds your capital budget/);
  });
});
