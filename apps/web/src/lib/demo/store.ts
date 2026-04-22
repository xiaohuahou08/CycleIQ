import { randomUUID } from "crypto";
import type { DemoState } from "@/lib/demo/types";

declare global {
  var __cycleiqDemoState: DemoState | undefined;
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

