import test from "node:test";
import assert from "node:assert/strict";

const mockTrades = [
  {
    id: "mock-seed-1",
    ticker: "AAPL",
    option_type: "PUT",
    strike: 175,
    expiry: "2026-06-20",
    trade_date: "2026-04-15",
    premium: 2.45,
    contracts: 1,
    delta: -0.25,
    status: "OPEN",
    notes: "CSP seed sample",
  },
  {
    id: "mock-seed-2",
    ticker: "MSFT",
    option_type: "CALL",
    strike: 400,
    expiry: "2026-05-16",
    trade_date: "2026-04-08",
    premium: 1.85,
    contracts: 2,
    status: "ASSIGNED",
  },
];

function sumPremiumDollars(trades) {
  return trades.reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);
}

test("mock trade fixtures match frontend trade contract", () => {
  for (const trade of mockTrades) {
    assert.equal(typeof trade.id, "string");
    assert.equal(typeof trade.ticker, "string");
    assert.ok(["PUT", "CALL"].includes(trade.option_type));
    assert.equal(typeof trade.strike, "number");
    assert.match(trade.expiry, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(trade.trade_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof trade.premium, "number");
    assert.equal(typeof trade.contracts, "number");
    assert.ok(["OPEN", "CLOSED", "EXPIRED", "ASSIGNED", "CALLED_AWAY", "ROLLED"].includes(trade.status));
  }
});

test("mock trade fixtures produce deterministic premium totals", () => {
  assert.equal(sumPremiumDollars(mockTrades), 615);
});
