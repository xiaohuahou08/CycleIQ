import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commissionFeeTotal } from "../trades/commissionFee.ts";

describe("commissionFeeTotal", () => {
  it("multiplies per-contract rate by contract count", () => {
    assert.equal(commissionFeeTotal(0.65, 1), 0.65);
    assert.equal(commissionFeeTotal(0.65, 3), 1.95);
  });

  it("returns undefined when per-contract is not set", () => {
    assert.equal(commissionFeeTotal(undefined, 2), undefined);
  });
});
