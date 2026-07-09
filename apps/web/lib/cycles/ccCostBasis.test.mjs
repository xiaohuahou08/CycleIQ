import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  availableCcSharesForTicker,
  basisReducingCcPremium,
  buildCcCostBasisRows,
  effectiveCcPremiumForBasis,
  isCompletedWheel,
  netLegCashflow,
  resolveTradeCycleId,
  wheelTotalNetPnl,
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
        id: "wheel-active",
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
    // option cashflows: 250 + 300; stock gain: (400 - 387.5) * 100
    assert.equal(pnl, 550 + 1250);
  });

  it("excludes ROLLED legs from double-counting roll premium", () => {
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
    assert.equal(pnl, 200);
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
