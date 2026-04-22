import type { CycleRow, ExecutionRow, IntentRow } from "@/lib/demo/types";

type NowIso = () => string;
type IdFactory = () => string;

export type WheelEventType =
  | "CSP_EXPIRE_OTM"
  | "CSP_ASSIGNED"
  | "CC_EXPIRE_OTM"
  | "CC_ASSIGNED"
  | "EXECUTION_FILLED";

export type ActionDeps = {
  nowIso: NowIso;
  newId: IdFactory;
  seedLabel?: string;
};

function defaultNowIso() {
  return new Date().toISOString();
}

function requireDeps(deps?: Partial<ActionDeps>): ActionDeps {
  return {
    nowIso: deps?.nowIso ?? defaultNowIso,
    newId:
      deps?.newId ??
      (() => {
        if ("randomUUID" in globalThis && typeof globalThis.randomUUID === "function") {
          return globalThis.randomUUID();
        }
        // Fallback to a short pseudo-id (good enough for demo mode)
        return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      }),
    seedLabel: deps?.seedLabel,
  };
}

export type PlanResult = {
  intent: IntentRow;
};

export function planNextStepForCycle(
  cycle: CycleRow,
  deps?: Partial<ActionDeps>
): PlanResult {
  const d = requireDeps(deps);
  const createdAt = d.nowIso();

  const type: IntentRow["type"] =
    cycle.state === "CC_OPEN"
      ? "CC_ROLL"
      : cycle.state === "CSP_OPEN"
      ? "SELL_CSP"
      : cycle.state === "STOCK_HELD"
      ? "SELL_CC"
      : "EXIT";

  const legs =
    type === "CC_ROLL"
      ? "BUY CALL (current) x1; SELL CALL (next) x1"
      : type === "SELL_CSP"
      ? "SELL PUT (next) x1"
      : type === "SELL_CC"
      ? "SELL CALL (next) x1"
      : "EXIT POSITION";

  const intent: IntentRow = {
    id: d.newId(),
    createdAt,
    cycleId: cycle.id,
    ticker: cycle.ticker,
    type,
    legs,
    estimatedPremium: Math.max(0, Math.round((cycle.premium || 0) * 0.25 * 100) / 100),
    riskStatus: "warn",
    approvalStatus: "draft",
  };

  return { intent };
}

export function approveIntent(intent: IntentRow): IntentRow {
  if (intent.approvalStatus === "approved") return intent;
  if (intent.approvalStatus === "rejected") return intent;
  return { ...intent, approvalStatus: "approved" };
}

export type ExecuteResult = {
  execution: ExecutionRow;
};

export function executeIntent(
  intent: IntentRow,
  deps?: Partial<ActionDeps>
): ExecuteResult {
  const d = requireDeps(deps);
  const now = d.nowIso();
  const short = intent.id.slice(0, 8);
  const label = d.seedLabel ?? "dryrun";

  const execution: ExecutionRow = {
    id: d.newId(),
    startedAt: now,
    ticker: intent.ticker,
    intentId: intent.id,
    status: "acked",
    broker: "simulated",
    clientOrderId: `ci_${label}_${short}`,
    externalOrderId: null,
    lastUpdate: now,
  };

  return { execution };
}

export function cancelExecution(execution: ExecutionRow, deps?: Partial<ActionDeps>) {
  const d = requireDeps(deps);
  if (execution.status === "canceled") return execution;
  if (execution.status === "filled") return execution;
  return { ...execution, status: "canceled", lastUpdate: d.nowIso() };
}

export function retryExecution(
  execution: ExecutionRow,
  deps?: Partial<ActionDeps>
): ExecutionRow {
  const d = requireDeps(deps);
  const now = d.nowIso();
  const label = d.seedLabel ?? "retry";
  const short = execution.intentId.slice(0, 8);

  // Prefer creating a new execution row for retries so history remains intact.
  return {
    id: d.newId(),
    startedAt: now,
    ticker: execution.ticker,
    intentId: execution.intentId,
    status: "submitted",
    broker: "simulated",
    clientOrderId: `ci_${label}_${short}`,
    externalOrderId: null,
    lastUpdate: now,
  };
}

export type ApplyWheelEventResult = {
  cycle: CycleRow;
  note: string;
};

export function applyWheelEvent(
  cycle: CycleRow,
  eventType: WheelEventType,
  deps?: Partial<ActionDeps>
): ApplyWheelEventResult {
  const d = requireDeps(deps);
  const updatedAt = d.nowIso();

  if (eventType === "CSP_ASSIGNED") {
    return {
      cycle: { ...cycle, state: "STOCK_HELD", currentLeg: null, updatedAt },
      note: "CSP assigned → STOCK_HELD",
    };
  }

  if (eventType === "CSP_EXPIRE_OTM") {
    return {
      cycle: {
        ...cycle,
        state: "CSP_OPEN",
        rollCount: cycle.rollCount + 1,
        currentLeg: "PUT (next)",
        updatedAt,
      },
      note: "CSP expired OTM → continue CSP wheel",
    };
  }

  if (eventType === "CC_EXPIRE_OTM") {
    return {
      cycle: {
        ...cycle,
        state: "STOCK_HELD",
        rollCount: cycle.rollCount + 1,
        currentLeg: null,
        updatedAt,
      },
      note: "CC expired OTM → back to STOCK_HELD",
    };
  }

  if (eventType === "CC_ASSIGNED") {
    return {
      cycle: { ...cycle, state: "EXIT", currentLeg: null, updatedAt },
      note: "CC assigned (called away) → EXIT",
    };
  }

  return {
    cycle: { ...cycle, updatedAt },
    note: "Execution filled (no-op for cycle in MVP)",
  };
}

