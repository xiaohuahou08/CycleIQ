import assert from "node:assert/strict";
import test from "node:test";
import { APP_LOADING_PHASES } from "./useSlowLoadingMessage.ts";

test("APP_LOADING_PHASES escalates messages over time", () => {
  assert.equal(APP_LOADING_PHASES[0]?.message, "Loading your workspace…");
  assert.equal(APP_LOADING_PHASES[1]?.afterMs, 3000);
  assert.equal(APP_LOADING_PHASES[2]?.message, "Almost there…");
});
