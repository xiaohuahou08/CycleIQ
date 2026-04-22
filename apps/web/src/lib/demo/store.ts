import { randomUUID } from "crypto";
import type { DemoState } from "@/lib/demo/types";
import type { ExecutionRow, IntentRow } from "@/lib/demo/types";
import {
  approveIntent,
  applyWheelEvent,
  cancelExecution,
  executeIntent,
  planNextStepForCycle,
  retryExecution,
} from "@/lib/terminal/actions";
import type { CycleRow, CycleState } from "@/lib/demo/types";
import type { WheelEventType } from "@/lib/terminal/actions";
import {
  autoNextIntent,
  generateMarketSnapshot,
  generateOptionChain,
  pickExpiry,
} from "@/lib/terminal/wheel-engine";
import type {
  MarketSnapshot,
  OptionChain,
  WheelAdvanceAction,
  WheelStrategyParams,
} from "@/lib/terminal/wheel-engine";

declare global {
  var __cycleiqDemoState: DemoState | undefined;
  var __cycleiqWheel3:
    | {
        seed: string;
        asOfDate: string; // YYYY-MM-DD
        strategies: Record<string, WheelStrategyParams>;
        wheelEvents: {
          id: string;
          cycleId: string;
          createdAt: string;
          eventType: string;
          payload: Record<string, unknown>;
        }[];
        market: MarketSnapshot | null;
        chains: Record<string, { put: OptionChain; call: OptionChain }>;
      }
    | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function baseState(): DemoState {
  return { seededAt: null, cycles: [], intents: [], executions: [] };
}

export function getDemoState(): DemoState {
  if (!globalThis.__cycleiqDemoState) globalThis.__cycleiqDemoState = baseState();
  return globalThis.__cycleiqDemoState;
}

export function resetDemoState() {
  globalThis.__cycleiqDemoState = baseState();
  globalThis.__cycleiqWheel3 = undefined;
}

export function seedDemoState(seedLabel = "default") {
  const seededAt = nowIso();

  const cycles = [
    {
      id: randomUUID(),
      ticker: "AAPL",
      state: "CSP_OPEN" as const,
      currentLeg: "PUT 180 2026-05-17",
      premium: 250,
      stockPnl: 0,
      totalPnl: 250,
      rollCount: 0,
      updatedAt: seededAt,
    },
    {
      id: randomUUID(),
      ticker: "TSLA",
      state: "CC_OPEN" as const,
      currentLeg: "CALL 210 2026-06-21",
      premium: 500,
      stockPnl: 1000,
      totalPnl: 1500,
      rollCount: 1,
      updatedAt: seededAt,
    },
    {
      id: randomUUID(),
      ticker: "NVDA",
      state: "STOCK_HELD" as const,
      currentLeg: null,
      premium: 350,
      stockPnl: -200,
      totalPnl: 150,
      rollCount: 2,
      updatedAt: seededAt,
    },
  ];

  const intents = [
    {
      id: randomUUID(),
      createdAt: seededAt,
      cycleId: cycles[0].id,
      ticker: "AAPL",
      type: "SELL_CSP" as const,
      legs: "SELL PUT 180 2026-05-17 x1",
      estimatedPremium: 250,
      riskStatus: "pass" as const,
      approvalStatus: "pending" as const,
    },
    {
      id: randomUUID(),
      createdAt: seededAt,
      cycleId: cycles[1].id,
      ticker: "TSLA",
      type: "CC_ROLL" as const,
      legs: "BUY CALL 210 2026-06-21 x1; SELL CALL 215 2026-07-19 x1",
      estimatedPremium: 120,
      riskStatus: "warn" as const,
      approvalStatus: "approved" as const,
    },
  ];

  const executions = [
    {
      id: randomUUID(),
      startedAt: seededAt,
      ticker: "TSLA",
      intentId: intents[1].id,
      status: "acked" as const,
      broker: "simulated" as const,
      clientOrderId: `ci_${seedLabel}_${intents[1].id.slice(0, 8)}`,
      externalOrderId: null,
      lastUpdate: seededAt,
    },
  ];

  globalThis.__cycleiqDemoState = { seededAt, cycles, intents, executions };
}

function getWheel3() {
  if (!globalThis.__cycleiqWheel3) {
    globalThis.__cycleiqWheel3 = {
      seed: "default",
      asOfDate: nowIso().slice(0, 10),
      strategies: {},
      wheelEvents: [],
      market: null,
      chains: {},
    };
  }
  return globalThis.__cycleiqWheel3;
}

export function createWheel3Demo(params: {
  ticker: string;
  seed?: string;
  asOfDate?: string; // YYYY-MM-DD
  strategy: WheelStrategyParams;
}) {
  const state = getDemoState();
  const w3 = getWheel3();

  const ticker = params.ticker.trim().toUpperCase();
  const asOfDate = params.asOfDate ?? w3.asOfDate;
  const seed = params.seed ?? w3.seed;

  w3.seed = seed;
  w3.asOfDate = asOfDate;

  const now = nowIso();
  const cycle: CycleRow = {
    id: randomUUID(),
    ticker,
    state: "CSP_OPEN",
    currentLeg: null,
    premium: 0,
    stockPnl: 0,
    totalPnl: 0,
    rollCount: 0,
    updatedAt: now,
  };
  state.cycles.unshift(cycle);
  w3.strategies[cycle.id] = params.strategy;

  // Deterministic market + chain
  const snapshot = generateMarketSnapshot({ asOfDateYmd: asOfDate, seed, tickers: [ticker] });
  const quote = snapshot.underlyings[ticker];
  const expiry = pickExpiry(asOfDate, params.strategy.targetDte);
  const putChain = generateOptionChain({
    ticker,
    asOfDateYmd: asOfDate,
    seed,
    right: "PUT",
    expiryYmd: expiry,
    underlying: quote,
  });
  const callChain = generateOptionChain({
    ticker,
    asOfDateYmd: asOfDate,
    seed,
    right: "CALL",
    expiryYmd: expiry,
    underlying: quote,
  });
  w3.market = snapshot;
  w3.chains[ticker] = { put: putChain, call: callChain };

  // Initial intent (SELL_CSP draft)
  const next = autoNextIntent({
    cycle,
    strategy: params.strategy,
    snapshot,
    putChain,
    callChain,
  });
  const intent: IntentRow = {
    id: randomUUID(),
    createdAt: now,
    cycleId: cycle.id,
    ticker,
    type: next.intentType,
    legs: next.legs,
    estimatedPremium: next.estPremium,
    riskStatus: "pass",
    approvalStatus: "draft",
  };
  state.intents.unshift(intent);
  return { cycleId: cycle.id, intentId: intent.id };
}

export function executeWheel3Demo(intentIds: string[]) {
  const state = getDemoState();
  const now = nowIso();
  let created = 0;
  for (const id of intentIds) {
    const intent = state.intents.find((i) => i.id === id);
    if (!intent) continue;

    // One-click simulation: submitted -> acked -> filled (collapse to filled with timestamps)
    const execution: ExecutionRow = {
      id: randomUUID(),
      startedAt: now,
      ticker: intent.ticker,
      intentId: intent.id,
      status: "filled",
      broker: "simulated",
      clientOrderId: `ci_fill_${intent.id.slice(0, 8)}`,
      externalOrderId: null,
      lastUpdate: now,
    };
    state.executions.unshift(execution);
    created += 1;
  }
  return { created };
}

export function advanceWheel3Demo(params: {
  cycleId: string;
  action: WheelAdvanceAction;
  days?: number;
}) {
  const state = getDemoState();
  const w3 = getWheel3();

  const cycle = state.cycles.find((c) => c.id === params.cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  const strategy = w3.strategies[cycle.id];
  if (!strategy) throw new Error("Missing strategy for cycle.");
  if (!w3.market) throw new Error("Missing market snapshot.");

  const ticker = cycle.ticker;
  const chains = w3.chains[ticker];
  if (!chains) throw new Error("Missing option chain.");

  const eventType =
    params.action === "expire_otm"
      ? cycle.state === "CSP_OPEN"
        ? ("CSP_EXPIRE_OTM" as const)
        : ("CC_EXPIRE_OTM" as const)
      : params.action === "assigned"
      ? ("CSP_ASSIGNED" as const)
      : ("CC_ASSIGNED" as const);

  const { cycle: nextCycle, note } = applyWheelEvent(cycle, eventType as WheelEventType, {
    nowIso,
    newId: () => randomUUID(),
  });
  replaceCycle(state, nextCycle);

  w3.wheelEvents.unshift({
    id: randomUUID(),
    cycleId: nextCycle.id,
    createdAt: nowIso(),
    eventType,
    payload: { note, days: params.days ?? 0 },
  });

  // Auto-create next recommended intent as draft
  const nextIntentInfo = autoNextIntent({
    cycle: nextCycle,
    strategy,
    snapshot: w3.market,
    putChain: chains.put,
    callChain: chains.call,
  });
  const intent: IntentRow = {
    id: randomUUID(),
    createdAt: nowIso(),
    cycleId: nextCycle.id,
    ticker,
    type: nextIntentInfo.intentType,
    legs: nextIntentInfo.legs,
    estimatedPremium: nextIntentInfo.estPremium,
    riskStatus: "pass",
    approvalStatus: "draft",
  };
  state.intents.unshift(intent);

  return { ok: true, eventType, note, nextState: nextCycle.state, nextIntentId: intent.id };
}

export function getWheel3Market() {
  const w3 = getWheel3();
  return { market: w3.market, asOfDate: w3.asOfDate, seed: w3.seed };
}

function replaceIntent(state: DemoState, next: IntentRow) {
  const idx = state.intents.findIndex((i) => i.id === next.id);
  if (idx === -1) state.intents.unshift(next);
  else state.intents[idx] = next;
}

function replaceExecution(state: DemoState, next: ExecutionRow) {
  const idx = state.executions.findIndex((e) => e.id === next.id);
  if (idx === -1) state.executions.unshift(next);
  else state.executions[idx] = next;
}

function replaceCycle(state: DemoState, next: CycleRow) {
  const idx = state.cycles.findIndex((c) => c.id === next.id);
  if (idx === -1) state.cycles.unshift(next);
  else state.cycles[idx] = next;
}

export function createDemoCycle(params: {
  ticker: string;
  state?: CycleState;
  autoCreateFirstIntent?: boolean;
}) {
  const state = getDemoState();
  const now = nowIso();
  const cycle: CycleRow = {
    id: randomUUID(),
    ticker: params.ticker.toUpperCase(),
    state: params.state ?? "CSP_OPEN",
    currentLeg: params.state === "CSP_OPEN" ? "PUT (next)" : null,
    premium: 0,
    stockPnl: 0,
    totalPnl: 0,
    rollCount: 0,
    updatedAt: now,
  };
  state.cycles.unshift(cycle);

  let intentId: string | null = null;
  if (params.autoCreateFirstIntent ?? true) {
    const intent: IntentRow = {
      id: randomUUID(),
      createdAt: now,
      cycleId: cycle.id,
      ticker: cycle.ticker,
      type: "SELL_CSP",
      legs: "SELL PUT (next) x1",
      estimatedPremium: 0,
      riskStatus: "pass",
      approvalStatus: "draft",
    };
    state.intents.unshift(intent);
    intentId = intent.id;
  }

  return { cycleId: cycle.id, intentId };
}

export function applyDemoCycleEvent(params: {
  cycleId: string;
  eventType: WheelEventType;
}) {
  const state = getDemoState();
  const cycle = state.cycles.find((c) => c.id === params.cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  const { cycle: next, note } = applyWheelEvent(cycle, params.eventType, {
    nowIso,
    newId: () => randomUUID(),
  });
  replaceCycle(state, next);
  return { ok: true, note, state: next.state };
}

export function approveDemoIntents(intentIds: string[]) {
  const state = getDemoState();
  let updated = 0;
  for (const id of intentIds) {
    const intent = state.intents.find((i) => i.id === id);
    if (!intent) continue;
    const next = approveIntent(intent);
    if (next.approvalStatus !== intent.approvalStatus) updated += 1;
    replaceIntent(state, next);
  }
  return { updated };
}

export function executeDemoIntents(intentIds: string[], seedLabel = "dryrun") {
  const state = getDemoState();
  let created = 0;
  for (const id of intentIds) {
    const intent = state.intents.find((i) => i.id === id);
    if (!intent) continue;
    const { execution } = executeIntent(intent, {
      seedLabel,
      newId: () => randomUUID(),
      nowIso,
    });
    state.executions.unshift(execution);
    created += 1;
  }
  return { created };
}

export function planDemoCycles(cycleIds: string[], seedLabel = "plan") {
  const state = getDemoState();
  let created = 0;
  for (const id of cycleIds) {
    const cycle = state.cycles.find((c) => c.id === id);
    if (!cycle) continue;
    const { intent } = planNextStepForCycle(cycle, {
      seedLabel,
      newId: () => randomUUID(),
      nowIso,
    });
    state.intents.unshift(intent);
    created += 1;
  }
  return { created };
}

export function cancelDemoExecutions(executionIds: string[]) {
  const state = getDemoState();
  let updated = 0;
  for (const id of executionIds) {
    const ex = state.executions.find((e) => e.id === id);
    if (!ex) continue;
    const next = cancelExecution(ex, { nowIso, newId: () => randomUUID() });
    if (next.status !== ex.status) updated += 1;
    replaceExecution(state, next);
  }
  return { updated };
}

export function retryDemoExecutions(executionIds: string[], seedLabel = "retry") {
  const state = getDemoState();
  let created = 0;
  for (const id of executionIds) {
    const ex = state.executions.find((e) => e.id === id);
    if (!ex) continue;
    const next = retryExecution(ex, { nowIso, newId: () => randomUUID(), seedLabel });
    replaceExecution(state, next);
    created += 1;
  }
  return { created };
}

