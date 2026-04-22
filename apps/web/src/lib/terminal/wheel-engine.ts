import type { CycleRow, IntentRow } from "@/lib/terminal/types";

export type WheelStrategyParams = {
  contracts: number;
  targetDte: number;
  targetDelta: number; // e.g. 0.25
  rollDaysBefore: number;
  takeProfitPct: number; // 0..1
  stopLossPct?: number;
};

export type UnderlyingQuote = {
  price: number;
  iv: number;
};

export type MarketSnapshot = {
  asOfDate: string; // YYYY-MM-DD
  seed: string;
  underlyings: Record<string, UnderlyingQuote>;
};

export type OptionRight = "PUT" | "CALL";

export type OptionStrikeRow = {
  delta: number;
  mid: number;
  iv: number;
};

export type OptionChain = {
  ticker: string;
  expiry: string; // YYYY-MM-DD
  right: OptionRight;
  strikes: Record<string, OptionStrikeRow>; // strike as string
};

export type WheelAdvanceAction = "expire_otm" | "assigned" | "call_away";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Simple deterministic PRNG (mulberry32)
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickExpiry(asOfDateYmd: string, targetDte: number) {
  const base = new Date(`${asOfDateYmd}T00:00:00.000Z`);
  // Roughly align to Fridays (weekday 5)
  const target = addDays(base, targetDte);
  const dow = target.getUTCDay(); // 0..6 (Sun..Sat)
  const daysToFri = (5 - dow + 7) % 7;
  return toYmd(addDays(target, daysToFri));
}

export function generateMarketSnapshot(params: {
  asOfDateYmd: string;
  seed: string;
  tickers: string[];
}) : MarketSnapshot {
  const r = rng(hashSeed(`${params.seed}:${params.asOfDateYmd}`));
  const underlyings: Record<string, UnderlyingQuote> = {};

  for (const t of params.tickers) {
    const base = 50 + r() * 250;
    const iv = clamp(0.18 + r() * 0.4, 0.12, 1.2);
    underlyings[t] = { price: Math.round(base * 100) / 100, iv: Math.round(iv * 1000) / 1000 };
  }

  return { asOfDate: params.asOfDateYmd, seed: params.seed, underlyings };
}

export function generateOptionChain(params: {
  ticker: string;
  asOfDateYmd: string;
  seed: string;
  right: OptionRight;
  expiryYmd: string;
  underlying: UnderlyingQuote;
}): OptionChain {
  const r = rng(hashSeed(`${params.seed}:${params.asOfDateYmd}:${params.ticker}:${params.right}:${params.expiryYmd}`));
  const { price, iv } = params.underlying;

  // Generate strikes around underlying
  const step = price < 50 ? 1 : price < 200 ? 2.5 : 5;
  const minStrike = Math.max(step, Math.floor((price * 0.6) / step) * step);
  const maxStrike = Math.ceil((price * 1.4) / step) * step;

  const strikes: Record<string, OptionStrikeRow> = {};
  for (let k = minStrike; k <= maxStrike + 1e-9; k += step) {
    // crude delta surface: puts negative, calls positive, magnitude higher near ATM
    const moneyness = (k - price) / price;
    const atmBoost = Math.exp(-Math.abs(moneyness) * 6);
    const sign = params.right === "PUT" ? -1 : 1;
    const deltaMag = clamp(0.05 + 0.55 * atmBoost + r() * 0.05, 0.02, 0.95);
    const delta = sign * deltaMag;

    // crude mid pricing: proportional to iv * price * sqrt(T)
    const tYears = clamp((new Date(`${params.expiryYmd}T00:00:00.000Z`).getTime() - new Date(`${params.asOfDateYmd}T00:00:00.000Z`).getTime()) / (365 * 24 * 3600 * 1000), 1/365, 2);
    const basePremium = iv * price * Math.sqrt(tYears) * (0.08 + 0.25 * atmBoost);
    const noise = 0.9 + r() * 0.2;
    const mid = Math.max(0.05, basePremium * noise);

    strikes[k.toFixed(2)] = {
      delta: Math.round(delta * 1000) / 1000,
      mid: Math.round(mid * 100) / 100,
      iv: Math.round(iv * 1000) / 1000,
    };
  }

  return { ticker: params.ticker, expiry: params.expiryYmd, right: params.right, strikes };
}

export function pickStrike(chain: OptionChain, targetDelta: number) {
  const target = Math.abs(targetDelta);
  let best: { strike: number; row: OptionStrikeRow; diff: number } | null = null;
  for (const [k, row] of Object.entries(chain.strikes)) {
    const strike = Number(k);
    const diff = Math.abs(Math.abs(row.delta) - target);
    if (!best || diff < best.diff) best = { strike, row, diff };
  }
  if (!best) throw new Error("Empty chain.");
  return { strike: best.strike, row: best.row };
}

export function makeIntentLegs(params: {
  ticker: string;
  right: OptionRight;
  strike: number;
  expiryYmd: string;
  contracts: number;
  side: "SELL" | "BUY";
}) {
  const strikeStr = Number.isInteger(params.strike) ? String(params.strike) : params.strike.toFixed(2);
  return `${params.side} ${params.right} ${strikeStr} ${params.expiryYmd} x${params.contracts}`;
}

export function estimatePremium(params: { mid: number; contracts: number }) {
  // mid is per share; option contract is 100 shares
  return Math.round(params.mid * params.contracts * 100 * 100) / 100;
}

export function autoNextIntent(params: {
  cycle: CycleRow;
  strategy: WheelStrategyParams;
  snapshot: MarketSnapshot;
  putChain: OptionChain;
  callChain: OptionChain;
}): { intentType: IntentRow["type"]; legs: string; estPremium: number } {
  const { cycle, strategy } = params;
  const expiry = pickExpiry(params.snapshot.asOfDate, strategy.targetDte);

  if (cycle.state === "CSP_OPEN") {
    const { strike, row } = pickStrike({ ...params.putChain, expiry }, strategy.targetDelta);
    const legs = makeIntentLegs({
      ticker: cycle.ticker,
      right: "PUT",
      strike,
      expiryYmd: expiry,
      contracts: strategy.contracts,
      side: "SELL",
    });
    return { intentType: "SELL_CSP", legs, estPremium: estimatePremium({ mid: row.mid, contracts: strategy.contracts }) };
  }

  if (cycle.state === "STOCK_HELD") {
    const { strike, row } = pickStrike({ ...params.callChain, expiry }, strategy.targetDelta);
    const legs = makeIntentLegs({
      ticker: cycle.ticker,
      right: "CALL",
      strike,
      expiryYmd: expiry,
      contracts: strategy.contracts,
      side: "SELL",
    });
    return { intentType: "SELL_CC", legs, estPremium: estimatePremium({ mid: row.mid, contracts: strategy.contracts }) };
  }

  if (cycle.state === "CC_OPEN") {
    // Roll: buy current, sell next (simplified)
    const { strike, row } = pickStrike({ ...params.callChain, expiry }, strategy.targetDelta);
    const legs = `BUY CALL (current) x${strategy.contracts}; ${makeIntentLegs({
      ticker: cycle.ticker,
      right: "CALL",
      strike,
      expiryYmd: expiry,
      contracts: strategy.contracts,
      side: "SELL",
    })}`;
    return { intentType: "CC_ROLL", legs, estPremium: estimatePremium({ mid: row.mid, contracts: strategy.contracts }) };
  }

  return { intentType: "EXIT", legs: "EXIT POSITION", estPremium: 0 };
}

export function advanceWheelState(params: {
  cycle: CycleRow;
  action: WheelAdvanceAction;
  days?: number;
}): { cycle: CycleRow; eventType: string; note: string } {
  // Map UI action to existing event types for now (compatible with earlier MVP)
  const eventType =
    params.action === "expire_otm"
      ? params.cycle.state === "CSP_OPEN"
        ? "CSP_EXPIRE_OTM"
        : "CC_EXPIRE_OTM"
      : params.action === "assigned"
      ? "CSP_ASSIGNED"
      : "CC_ASSIGNED";

  // Reuse existing applyWheelEvent logic via import cycle state updates in the caller.
  return { cycle: params.cycle, eventType, note: `advance:${params.action}` };
}

