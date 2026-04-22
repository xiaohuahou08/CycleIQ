export type CycleState =
  | "IDLE"
  | "CSP_OPEN"
  | "CSP_CLOSED"
  | "STOCK_HELD"
  | "CC_OPEN"
  | "EXIT";

export type RiskStatus = "pass" | "warn" | "fail";
export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export type IntentType =
  | "SELL_CSP"
  | "CSP_ROLL"
  | "CSP_EXPIRE_OTM"
  | "CSP_ASSIGNED"
  | "SELL_CC"
  | "CC_ROLL"
  | "CC_EXPIRE_OTM"
  | "CC_ASSIGNED"
  | "EXIT";

export type OmsStatus =
  | "planned"
  | "submitted"
  | "acked"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "failed";

export type CycleRow = {
  id: string;
  ticker: string;
  state: CycleState;
  currentLeg: string | null;
  premium: number;
  stockPnl: number;
  totalPnl: number;
  rollCount: number;
  updatedAt: string;
};

export type IntentRow = {
  id: string;
  createdAt: string;
  cycleId: string;
  ticker: string;
  type: IntentType;
  legs: string;
  estimatedPremium: number;
  riskStatus: RiskStatus;
  approvalStatus: ApprovalStatus;
};

export type ExecutionRow = {
  id: string;
  startedAt: string;
  ticker: string;
  intentId: string;
  status: OmsStatus;
  broker: "simulated" | "moomoo";
  clientOrderId: string;
  externalOrderId: string | null;
  lastUpdate: string;
};

export type DemoState = {
  seededAt: string | null;
  cycles: CycleRow[];
  intents: IntentRow[];
  executions: ExecutionRow[];
};

