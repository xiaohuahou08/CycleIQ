import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  availableCcSharesForTicker,
  basisReducingCcPremium,
  buildCcCostBasisRows,
  effectiveCcPremiumForBasis,
  effectiveStockCostPerShareForTrade,
  isCompletedWheel,
  netLegCashflow,
  resolveTradeCycleId,
  wheelTotalNetPnl,
  openAssignedPositions,
  computeUnrealizedStockMtm,
} from "./ccCostBasis.ts";

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
    status: "ASSIGNED",
    stock_cost_basis_per_share: 387.5,
    ...overrides,
  };
}

describe("netLegCashflow", () => {
  it("subtracts buyback and fees from gross premium", () => {
    const leg = trade({
      option_type: "CALL",
      premium: 3.0,
      buyback_cost_per_share: 0.5,
      commission_fee: 0.65,
      status: "ROLLED",
    });
    assert.equal(netLegCashflow(leg), 3.0 * 100 - 0.5 * 100 - 0.65);
  });
});

describe("basisReducingCcPremium", () => {
  it("includes EXPIRED, CLOSED, and ROLLED CC legs only", () => {
    const legs = [
      trade({ option_type: "CALL", status: "EXPIRED", premium: 2.0 }),
      trade({ id: "t2", option_type: "CALL", status: "OPEN", premium: 5.0 }),
      trade({ id: "t3", option_type: "CALL", status: "CALLED_AWAY", premium: 4.0 }),
      trade({ id: "t4", option_type: "CALL", status: "CLOSED", premium: 1.0 }),
    ];
    assert.equal(basisReducingCcPremium(legs), 300);
  });
});

describe("effectiveCcPremiumForBasis", () => {
  it("includes OPEN plus terminal CC legs", () => {
    const legs = [
      trade({ option_type: "CALL", status: "EXPIRED", premium: 2.0 }),
      trade({ id: "t2", option_type: "CALL", status: "OPEN", premium: 3.0 }),
      trade({ id: "t3", option_type: "CALL", status: "CALLED_AWAY", premium: 4.0 }),
    ];
    assert.equal(effectiveCcPremiumForBasis(legs), 500);
  });
});

describe("effectiveStockCostPerShareForTrade", () => {
  it("returns assignment basis for ASSIGNED CSP with no CC legs", () => {
    const put = trade({ status: "ASSIGNED", stock_cost_basis_per_share: 387.5 });
    assert.equal(effectiveStockCostPerShareForTrade(put, [put]), 387.5);
  });

  it("reduces CC stock cost by OPEN premium on same cycle", () => {
    const put = trade({
      id: "put",
      status: "ASSIGNED",
      stock_cost_basis_per_share: 387.5,
      cycle_id: "cycle-1",
    });
    const cc = trade({
      id: "cc",
      option_type: "CALL",
      status: "OPEN",
      premium: 3.0,
      cycle_id: "cycle-1",
    });
    const all = [put, cc];
    assert.equal(effectiveStockCostPerShareForTrade(cc, all), 384.5);
  });

  it("reduces ASSIGNED CSP stock cost by CC premium to match Cycles currentCost", () => {
    const put = trade({
      id: "put",
      status: "ASSIGNED",
      stock_cost_basis_per_share: 33.4406,
      cycle_id: "cycle-1",
    });
    const cc = trade({
      id: "cc",
      option_type: "CALL",
      status: "OPEN",
      premium: 1.24,
      commission_fee: 0.06,
      cycle_id: "cycle-1",
    });
    const all = [put, cc];
    assert.equal(effectiveStockCostPerShareForTrade(put, all), 32.2012);
    assert.equal(effectiveStockCostPerShareForTrade(cc, all), 32.2012);
  });
});

describe("buildCcCostBasisRows", () => {
  it("skips completed wheels and reduces basis from expired CC premium", () => {
    const assignedPut = trade({
      id: "put1",
      status: "ASSIGNED",
      stock_cost_basis_per_share: 387.5,
    });
    const expiredCc = trade({
      id: "cc1",
      option_type: "CALL",
      status: "EXPIRED",
      premium: 2.0,
    });
    const wheels = [
      {
        id: "wheel-active",
        ticker: "UNH",
        state: "STOCK_HELD",
        trades: [assignedPut, expiredCc],
      },
      {
        id: "wheel-done",
        ticker: "UNH",
        state: "EXIT",
        trades: [
          trade({
            id: "put2",
            status: "ASSIGNED",
            stock_cost_basis_per_share: 300,
          }),
        ],
      },
    ];

    const rows = buildCcCostBasisRows(wheels, [assignedPut, expiredCc]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].wheelId, "wheel-active");
    assert.equal(rows[0].initialCost, 387.5);
    assert.equal(rows[0].ccPremiumTotal, 200);
    assert.equal(rows[0].ccPremiumRealized, 200);
    assert.equal(rows[0].currentCost, 385.5);
  });

  it("reduces basis immediately when an OPEN CC is sold", () => {
    const assignedPut = trade({
      id: "put1",
      status: "ASSIGNED",
      stock_cost_basis_per_share: 100,
    });
    const openCc = trade({
      id: "cc-open",
      option_type: "CALL",
      status: "OPEN",
      premium: 2.0,
      cycle_id: "cycle-1",
    });
    const wheels = [
      {
        id: "cycle-1",
        ticker: "UNH",
        state: "CC_OPEN",
        trades: [assignedPut],
      },
    ];
    const allTrades = [
      { ...assignedPut, cycle_id: "cycle-1" },
      openCc,
    ];

    const rows = buildCcCostBasisRows(wheels, allTrades);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ccPremiumTotal, 200);
    assert.equal(rows[0].ccPremiumRealized, 0);
    assert.equal(rows[0].currentCost, 98);
    assert.equal(rows[0].ccPositions, 1);
  });

  it("does not mix CC cost basis across separate wheels on the same ticker", () => {
    const openCsp = trade({
      id: "csp-open",
      ticker: "HIMS",
      status: "OPEN",
      strike: 33,
      premium: 1.79,
      cycle_id: "cycle-csp",
    });
    const assignedPut = trade({
      id: "put-assigned",
      ticker: "HIMS",
      status: "ASSIGNED",
      strike: 34,
      premium: 0.56,
      stock_cost_basis_per_share: 33.4406,
      cycle_id: "cycle-cc",
    });
    const openCc = trade({
      id: "cc-open",
      ticker: "HIMS",
      option_type: "CALL",
      status: "OPEN",
      strike: 34,
      premium: 1.24,
      commission_fee: 0.06,
      cycle_id: "cycle-cc",
    });
    const wheels = [
      {
        id: "cycle-csp",
        ticker: "HIMS",
        state: "CSP_OPEN",
        trades: [openCsp],
      },
      {
        id: "cycle-cc",
        ticker: "HIMS",
        state: "CC_OPEN",
        trades: [assignedPut, openCc],
      },
    ];
    const allTrades = [openCsp, assignedPut, openCc];

    const rows = buildCcCostBasisRows(wheels, allTrades);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].wheelId, "cycle-cc");
    assert.equal(rows[0].initialCost, 33.4406);
    assert.equal(rows[0].currentCost, 32.2012);
    assert.equal(rows[0].ccPremiumTotal, 123.94);
  });

  it("includes orphan assigned puts not linked to a wheel split", () => {
    const orphanPut = trade({
      id: "orphan-put",
      cycle_id: "cycle-1",
      status: "ASSIGNED",
      stock_cost_basis_per_share: 380,
    });
    const rows = buildCcCostBasisRows([], [orphanPut]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].wheelId, "orphan:orphan-put");
    assert.equal(rows[0].initialCost, 380);
  });
});

describe("wheelTotalNetPnl", () => {
  it("adds stock sale gain when CC is called away", () => {
    const put = trade({
      status: "ASSIGNED",
      strike: 390,
      stock_cost_basis_per_share: 387.5,
      premium: 2.5,
    });
    const cc = trade({
      id: "cc-away",
      option_type: "CALL",
      status: "CALLED_AWAY",
      strike: 400,
      premium: 3.0,
    });
    const pnl = wheelTotalNetPnl([put, cc]);
    // option cashflows: 250 + 300; stock: (400 - 390) * 100 — use strike, not basis
    assert.equal(pnl, 550 + 1000);
  });

  it("includes ROLLED CC premium and does not double-count CSP premium", () => {
    const put = trade({
      id: "csp",
      status: "CALLED_AWAY",
      strike: 390,
      premium: 3.1994,
      stock_cost_basis_per_share: 386.8006,
    });
    const rolled = trade({
      id: "cc-roll",
      option_type: "CALL",
      status: "ROLLED",
      strike: 388,
      premium: 0.6195,
    });
    const ccAway = trade({
      id: "cc-away",
      option_type: "CALL",
      status: "CALLED_AWAY",
      strike: 390,
      premium: 1.049,
    });
    const pnl = wheelTotalNetPnl([put, rolled, ccAway]);
    // premiums only (stock strike-to-strike is 0): 319.94 + 61.95 + 104.90
    assert.equal(Math.round(pnl * 100) / 100, 486.79);
  });

  it("counts ROLLED CSP premium once via cashflow (stock uses strike)", () => {
    const rolled = trade({
      id: "rolled",
      status: "ROLLED",
      premium: 1.0,
      prior_roll_premium_per_share: 0.5,
    });
    const assigned = trade({
      id: "assigned",
      status: "ASSIGNED",
      premium: 2.0,
      prior_roll_premium_per_share: 0.5,
      stock_cost_basis_per_share: 387.5,
    });
    const pnl = wheelTotalNetPnl([rolled, assigned]);
    assert.equal(pnl, 100 + 200);
  });

  it("adds mark-to-market stock PnL when live price is provided after assignment", () => {
    const put = trade({
      status: "ASSIGNED",
      strike: 390,
      premium: 2.5,
      stock_cost_basis_per_share: 387.5,
    });
    // option cashflow 250 + (395 - 390) * 100
    assert.equal(wheelTotalNetPnl([put], 395), 250 + 500);
  });

  it("ignores live price when none is provided after assignment", () => {
    const put = trade({
      status: "ASSIGNED",
      strike: 390,
      premium: 2.5,
    });
    assert.equal(wheelTotalNetPnl([put]), 250);
    assert.equal(wheelTotalNetPnl([put], null), 250);
  });

  it("does not mark-to-market shares already called away", () => {
    const put = trade({
      status: "ASSIGNED",
      strike: 390,
      premium: 2.5,
      contracts: 2,
    });
    const ccAway = trade({
      id: "cc-away",
      option_type: "CALL",
      status: "CALLED_AWAY",
      strike: 400,
      premium: 3.0,
      contracts: 1,
    });
    // option: 500 + 300; realized stock on 100 shares: (400-390)*100; MTM on remaining 100: (395-390)*100
    assert.equal(wheelTotalNetPnl([put, ccAway], 395), 800 + 1000 + 500);
  });

  it("does not add MTM when all assigned shares were called away", () => {
    const put = trade({
      status: "ASSIGNED",
      strike: 390,
      premium: 2.5,
    });
    const ccAway = trade({
      id: "cc-away",
      option_type: "CALL",
      status: "CALLED_AWAY",
      strike: 400,
      premium: 3.0,
    });
    assert.equal(wheelTotalNetPnl([put, ccAway], 450), 550 + 1000);
  });
});

describe("computeUnrealizedStockMtm", () => {
  it("marks open assigned shares vs CSP strike", () => {
    const put = trade({ ticker: "googl", status: "ASSIGNED", strike: 367.5, premium: 1.45 });
    assert.deepEqual(openAssignedPositions([put]), [
      { ticker: "GOOGL", openShares: 100, avgAssignmentStrike: 367.5 },
    ]);
    assert.equal(computeUnrealizedStockMtm([put], { GOOGL: 345.5 }), (345.5 - 367.5) * 100);
  });

  it("skips tickers without a quote", () => {
    const put = trade({ status: "ASSIGNED", strike: 390 });
    assert.equal(computeUnrealizedStockMtm([put], {}), 0);
  });
});

describe("isCompletedWheel", () => {
  it("treats EXIT and CSP_CLOSED as completed", () => {
    assert.equal(isCompletedWheel("EXIT"), true);
    assert.equal(isCompletedWheel("CSP_CLOSED"), true);
    assert.equal(isCompletedWheel("STOCK_HELD"), false);
  });
});

describe("availableCcSharesForTicker", () => {
  it("returns zero without assigned stock", () => {
    assert.equal(availableCcSharesForTicker([], "AAPL"), 0);
  });

  it("subtracts called-away and open CC shares", () => {
    const trades = [
      trade({ id: "put", status: "ASSIGNED", contracts: 2 }),
      trade({ id: "cc-open", option_type: "CALL", status: "OPEN", contracts: 1 }),
      trade({ id: "cc-away", option_type: "CALL", status: "CALLED_AWAY", contracts: 1 }),
    ];
    assert.equal(availableCcSharesForTicker(trades, "UNH"), 0);
    assert.equal(
      availableCcSharesForTicker(trades, "UNH", { excludeTradeId: "cc-open" }),
      100
    );
  });
});

describe("resolveTradeCycleId", () => {
  it("inherits cycle_id from rolled_from chain", () => {
    const trades = [
      trade({ id: "rolled", status: "ROLLED", cycle_id: "cycle-1" }),
      trade({
        id: "open",
        status: "ASSIGNED",
        cycle_id: null,
        rolled_from_id: "rolled",
      }),
    ];
    assert.equal(resolveTradeCycleId(trades[1], trades), "cycle-1");
  });
});
