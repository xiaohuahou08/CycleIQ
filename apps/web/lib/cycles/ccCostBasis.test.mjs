import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  basisReducingCcPremium,
  buildCcCostBasisRows,
  isCompletedWheel,
  netLegCashflow,
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
    assert.equal(rows[0].currentCost, 385.5);
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
