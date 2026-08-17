import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WHEEL_FAN_CARD_H,
  WHEEL_FAN_CARD_W,
  fanArcPath,
  fanDegForCount,
  layoutWheelFan,
} from "./wheelFanLayout.ts";

function cardsOverlap(a, b, pad = 0) {
  return (
    Math.abs(a.x - b.x) < WHEEL_FAN_CARD_W + pad &&
    Math.abs(a.y - b.y) < WHEEL_FAN_CARD_H + pad
  );
}

describe("fanDegForCount", () => {
  it("keeps the original spread for 2–3 legs", () => {
    assert.equal(fanDegForCount(2), 110);
    assert.equal(fanDegForCount(3), 150);
  });

  it("opens toward a full circle once there are many legs", () => {
    assert.ok(fanDegForCount(10) > 180);
    assert.equal(fanDegForCount(12), 330);
  });
});

describe("layoutWheelFan", () => {
  it("keeps a modest radius for a few legs", () => {
    assert.equal(layoutWheelFan(1).arcR, 190);
    assert.equal(layoutWheelFan(3).arcR, 220);
  });

  it("does not explode the radius or canvas when a cycle has many legs", () => {
    const many = layoutWheelFan(12);
    assert.ok(many.arcR < 550, `arcR=${many.arcR}`);
    assert.ok(many.H < 1400, `H=${many.H}`);
  });

  it("keeps adjacent cards from overlapping", () => {
    for (const count of [2, 3, 5, 8, 12, 16]) {
      const { positions } = layoutWheelFan(count);
      for (let i = 0; i < positions.length - 1; i++) {
        assert.equal(
          cardsOverlap(positions[i], positions[i + 1]),
          false,
          `count=${count} pair ${i}`
        );
      }
    }
  });

  it("keeps many-leg arrows short instead of spanning a huge chord", () => {
    const many = layoutWheelFan(12).arrows.map((a) => Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
    assert.ok(many.length > 0);
    for (const len of many) {
      assert.ok(len >= 8, `arrow too short: ${len}`);
      assert.ok(len < 100, `arrow too long: ${len}`);
    }
  });

  it("keeps cards off the center hub", () => {
    const hubR = 68;
    const { cx, cy, positions } = layoutWheelFan(12);
    for (const [i, p] of positions.entries()) {
      const qx = Math.min(Math.max(cx, p.x - WHEEL_FAN_CARD_W / 2), p.x + WHEEL_FAN_CARD_W / 2);
      const qy = Math.min(Math.max(cy, p.y - WHEEL_FAN_CARD_H / 2), p.y + WHEEL_FAN_CARD_H / 2);
      const dist = Math.hypot(cx - qx, cy - qy);
      assert.ok(dist >= hubR - 0.5, `card ${i} dist=${dist}`);
    }
  });

  it("emits a fan arc rather than a full ring path", () => {
    const { cx, cy, ringR, startDeg, fanDeg } = layoutWheelFan(8);
    const d = fanArcPath(cx, cy, ringR, startDeg, fanDeg);
    assert.ok(d && d.includes(" A "));
    assert.equal(fanArcPath(cx, cy, ringR, startDeg, 0), null);
  });
});
