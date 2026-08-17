/** Geometry for the cycle detail fan: leg cards around a center node. */

export const WHEEL_FAN_CARD_W = 168;
export const WHEEL_FAN_CARD_H = 152;
export const WHEEL_FAN_CARD_GAP = 36;
/** Completed hub is 120px; keep cards clear of that plus a little air. */
const HUB_RADIUS = 68;
const HUB_GAP = 20;
const CANVAS_PAD = 40;

export type WheelFanPosition = { x: number; y: number };

export type WheelFanArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  i: number;
};

export type WheelFanLayout = {
  W: number;
  H: number;
  cx: number;
  cy: number;
  arcR: number;
  ringR: number;
  fanDeg: number;
  startDeg: number;
  positions: WheelFanPosition[];
  arrows: WheelFanArrow[];
};

/**
 * 2–7 legs stay a top-heavy fan. 8+ pack around the circle (one-step gap
 * between last and first) so radius — and fit-to-view shrink — stay in check.
 */
export function fanDegForCount(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 110;
  if (count === 3) return 150;
  if (count < 8) return Math.min(220, 110 + (count - 2) * 20);
  return (360 * (count - 1)) / count;
}

function rayToRectEdge(ux: number, uy: number, hw: number, hh: number): number {
  const tx = Math.abs(ux) < 1e-9 ? Number.POSITIVE_INFINITY : hw / Math.abs(ux);
  const ty = Math.abs(uy) < 1e-9 ? Number.POSITIVE_INFINITY : hh / Math.abs(uy);
  return Math.min(tx, ty);
}

/**
 * Smallest radius where two axis-aligned cards on this chord no longer overlap.
 * Cards clear once either the horizontal or the vertical gap is large enough —
 * requiring both (max of the two) explodes the radius when the step is small.
 */
function minRadiusForPair(
  a1: number,
  a2: number,
  cardW: number,
  cardH: number,
  cardGap: number
): number {
  const dcos = Math.abs(Math.cos(a2) - Math.cos(a1));
  const dsin = Math.abs(Math.sin(a2) - Math.sin(a1));
  const rH = dcos < 1e-9 ? Number.POSITIVE_INFINITY : (cardW + cardGap) / dcos;
  const rV = dsin < 1e-9 ? Number.POSITIVE_INFINITY : (cardH + cardGap) / dsin;
  const r = Math.min(rH, rV);
  return Number.isFinite(r) ? r : 0;
}

function arrowBetween(
  posA: WheelFanPosition,
  posB: WheelFanPosition,
  i: number,
  cardW: number,
  cardH: number
): WheelFanArrow {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hw = cardW / 2;
  const hh = cardH / 2;
  const inset = 8;
  const start = rayToRectEdge(ux, uy, hw, hh) + inset;
  const end = len - rayToRectEdge(-ux, -uy, hw, hh) - inset;
  if (end <= start) {
    const mid = len / 2;
    return {
      x1: posA.x + ux * (mid - 8),
      y1: posA.y + uy * (mid - 8),
      x2: posA.x + ux * (mid + 8),
      y2: posA.y + uy * (mid + 8),
      i,
    };
  }
  return {
    x1: posA.x + ux * start,
    y1: posA.y + uy * start,
    x2: posA.x + ux * end,
    y2: posA.y + uy * end,
    i,
  };
}

/** Dashed guide matching the card fan (not a full circle of empty space). */
export function fanArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  fanDeg: number
): string | null {
  if (r <= 0 || fanDeg < 1) return null;
  const start = (startDeg * Math.PI) / 180;
  const end = ((startDeg + fanDeg) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = fanDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function layoutWheelFan(count: number): WheelFanLayout {
  const cardW = WHEEL_FAN_CARD_W;
  const cardH = WHEEL_FAN_CARD_H;
  const cardGap = WHEEL_FAN_CARD_GAP;
  const hw = cardW / 2;
  const hh = cardH / 2;
  const fanDeg = fanDegForCount(count);
  const startDeg = -90 - fanDeg / 2;
  const startRad = (startDeg * Math.PI) / 180;
  const stepRad = count <= 1 ? 0 : ((fanDeg / (count - 1)) * Math.PI) / 180;

  let neededR = 0;
  for (let i = 0; i < count - 1; i++) {
    const a1 = startRad + i * stepRad;
    const a2 = startRad + (i + 1) * stepRad;
    neededR = Math.max(neededR, minRadiusForPair(a1, a2, cardW, cardH, cardGap));
  }

  for (let i = 0; i < Math.max(count, 1); i++) {
    const a = count <= 1 ? -Math.PI / 2 : startRad + i * stepRad;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const inward = rayToRectEdge(-ux, -uy, hw, hh);
    neededR = Math.max(neededR, HUB_RADIUS + HUB_GAP + inward);
  }

  const arcR = count <= 1 ? 190 : Math.max(220, Math.ceil(neededR));
  const ringR = arcR + 22;

  const raw = Array.from({ length: count }, (_, i) => {
    const angleDeg = count <= 1 ? -90 : startDeg + (i / (count - 1)) * fanDeg;
    const rad = (angleDeg * Math.PI) / 180;
    return { x: arcR * Math.cos(rad), y: arcR * Math.sin(rad) };
  });

  let minX = -HUB_RADIUS;
  let maxX = HUB_RADIUS;
  let minY = -HUB_RADIUS;
  let maxY = HUB_RADIUS;
  for (const p of raw) {
    minX = Math.min(minX, p.x - hw);
    maxX = Math.max(maxX, p.x + hw);
    minY = Math.min(minY, p.y - hh);
    maxY = Math.max(maxY, p.y + hh);
  }
  if (fanDeg >= 1) {
    const a0 = (startDeg * Math.PI) / 180;
    const a1 = ((startDeg + fanDeg) * Math.PI) / 180;
    for (const a of [a0, a1, -Math.PI / 2]) {
      minX = Math.min(minX, ringR * Math.cos(a));
      maxX = Math.max(maxX, ringR * Math.cos(a));
      minY = Math.min(minY, ringR * Math.sin(a));
      maxY = Math.max(maxY, ringR * Math.sin(a));
    }
  }

  const contentW = maxX - minX + CANVAS_PAD * 2;
  const contentH = maxY - minY + CANVAS_PAD * 2;
  const W = Math.max(720, Math.ceil(contentW));
  const H = Math.ceil(contentH);
  const cx = (W - (maxX - minX)) / 2 - minX;
  const cy = CANVAS_PAD - minY;

  const positions = raw.map((p) => ({ x: cx + p.x, y: cy + p.y }));
  const arrows = positions.slice(0, -1).map((posA, i) =>
    arrowBetween(posA, positions[i + 1]!, i, cardW, cardH)
  );

  return { W, H, cx, cy, arcR, ringR, fanDeg, startDeg, positions, arrows };
}
