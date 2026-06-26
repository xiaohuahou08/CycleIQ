import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  apiToTradeDefaults,
  tradeDefaultsToApi,
} from "./preferences.ts";

describe("tradeDefaults API mapping", () => {
  it("maps snake_case API payload to camelCase defaults", () => {
    assert.deepEqual(
      apiToTradeDefaults({
        commission_per_contract: 0.65,
        default_contracts: 2,
        default_dte: 30,
        total_capital_budget: 10000,
      }),
      {
        commissionPerContract: 0.65,
        defaultContracts: 2,
        defaultDte: 30,
        totalCapitalBudget: 10000,
      }
    );
  });

  it("maps undefined commission to null in API payload", () => {
    assert.deepEqual(
      tradeDefaultsToApi({
        defaultContracts: 1,
        defaultDte: 45,
        totalCapitalBudget: 10000,
      }),
      {
        commission_per_contract: null,
        default_contracts: 1,
        default_dte: 45,
        total_capital_budget: 10000,
      }
    );
  });
});
