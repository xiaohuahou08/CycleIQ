/**
 * Trade API Client
 *
 * ─── TEMPORARY MOCK MODE ───────────────────────────────────────────────────
 * SET MOCK_MODE = true  → returns fake data, Flask NOT needed
 * SET MOCK_MODE = false → calls real Flask API at NEXT_PUBLIC_API_URL
 *
 * TODO (xiaohua): Set MOCK_MODE = false once Flask API is deployed.
 * ─────────────────────────────────────────────────────────────────────────
 */
const MOCK_MODE = true; // <-- 改成 false 即可切换到真实 Flask API

export type TradeStatus =
  | "OPEN"
  | "CLOSED"
  | "EXPIRED"
  | "ASSIGNED"
  | "CALLED_AWAY"
  | "ROLLED";

export interface Trade {
  id: string;
  ticker: string;
  option_type: "PUT" | "CALL";
  strike: number;
  expiry: string;
  trade_date: string;
  premium: number;
  contracts: number;
  delta?: number;
  status: TradeStatus;
  notes?: string;
}

export interface CreateTradeInput {
  ticker: string;
  option_type: "PUT" | "CALL";
  strike: number;
  expiry: string;
  trade_date: string;
  premium: number;
  contracts: number;
  delta?: number;
  status: TradeStatus;
  notes?: string;
}

export interface MetricsSummary {
  total_premium: number;
  annualized_return: number;
  active_positions: number;
  win_rate: number;
}

// ─── Mock helpers ──────────────────────────────────────────────────────────

let _mockId = 1;
function nextId() {
  return `mock-${Date.now()}-${_mockId++}`;
}

// In-memory store so createTrade + listTrades stay consistent during a session
const _mockStore: Trade[] = [
  {
    id: "mock-seed-1",
    ticker: "AAPL",
    option_type: "PUT",
    strike: 175,
    expiry: "2026-06-20",
    trade_date: "2026-04-15",
    premium: 2.45,
    contracts: 1,
    delta: -0.25,
    status: "OPEN",
    notes: "CSP – assigned exit if challenged",
  },
  {
    id: "mock-seed-2",
    ticker: "MSFT",
    option_type: "PUT",
    strike: 380,
    expiry: "2026-05-16",
    trade_date: "2026-04-01",
    premium: 4.10,
    contracts: 1,
    delta: -0.20,
    status: "ASSIGNED",
    notes: "Assigned at $380. Rolling CC next.",
  },
  {
    id: "mock-seed-3",
    ticker: "MSFT",
    option_type: "CALL",
    strike: 400,
    expiry: "2026-05-16",
    trade_date: "2026-04-08",
    premium: 1.85,
    contracts: 1,
    delta: 0.15,
    status: "OPEN",
    notes: "CC against assigned MSFT shares",
  },
  {
    id: "mock-seed-4",
    ticker: "NVDA",
    option_type: "CALL",
    strike: 950,
    expiry: "2026-04-18",
    trade_date: "2026-03-28",
    premium: 8.20,
    contracts: 1,
    delta: 0.30,
    status: "EXPIRED",
    notes: "CC expired OTM – keeping premium",
  },
  {
    id: "mock-seed-5",
    ticker: "SPY",
    option_type: "PUT",
    strike: 520,
    expiry: "2026-06-06",
    trade_date: "2026-04-22",
    premium: 3.15,
    contracts: 2,
    delta: -0.18,
    status: "OPEN",
    notes: "Wide CSP, lower risk",
  },
];

function mockListTrades(): Trade[] {
  return [..._mockStore];
}

function mockGetMetricsSummary(): MetricsSummary {
  const trades = _mockStore;
  if (trades.length === 0) {
    return { total_premium: 0, annualized_return: 0, active_positions: 0, win_rate: 0 };
  }
  const active = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status !== "OPEN");
  const expiredOrOtm = closed.filter(
    (t) => t.status === "EXPIRED" || t.status === "CALLED_AWAY"
  );
  const totalPremium = trades.reduce((sum, t) => sum + t.premium * t.contracts * 100, 0);
  return {
    total_premium: Math.round(totalPremium * 100) / 100,
    annualized_return: active.length > 0 ? parseFloat((Math.random() * 15 + 5).toFixed(1)) : 0,
    active_positions: active.length,
    win_rate: closed.length > 0 ? parseFloat(((expiredOrOtm.length / closed.length) * 100).toFixed(1)) : 0,
  };
}

function mockCreateTrade(input: CreateTradeInput): Trade {
  const trade: Trade = { id: nextId(), ...input };
  _mockStore.push(trade);
  return trade;
}

// ─── Real API helpers ──────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function realListTrades(token: string, params?: { status?: string }): Promise<Trade[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const url = qs.size ? `${API_BASE}/api/trades?${qs}` : `${API_BASE}/api/trades`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load trades: ${res.status}`);
  const data = (await res.json()) as Trade[] | { trades: Trade[]; total: number };
  if (Array.isArray(data)) return data;
  return data.trades ?? [];
}

async function realGetMetricsSummary(token: string): Promise<MetricsSummary> {
  const res = await fetch(`${API_BASE}/api/metrics/summary`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load metrics: ${res.status}`);
  return res.json() as Promise<MetricsSummary>;
}

async function realCreateTrade(token: string, input: CreateTradeInput): Promise<Trade> {
  const res = await fetch(`${API_BASE}/api/trades`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create trade: ${res.status}`);
  return res.json() as Promise<Trade>;
}

async function realDeleteTrade(_token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/trades/${id}`, {
    method: "DELETE",
    headers: authHeaders(_token),
  });
  if (!res.ok) throw new Error(`Failed to delete trade: ${res.status}`);
}

// ─── Public API (dispatches to mock or real) ───────────────────────────────

export async function listTrades(
  _token: string,
  params?: { status?: string }
): Promise<Trade[]> {
  if (MOCK_MODE) return mockListTrades();
  return realListTrades(_token, params);
}

export async function getMetricsSummary(_token: string): Promise<MetricsSummary> {
  if (MOCK_MODE) return mockGetMetricsSummary();
  return realGetMetricsSummary(_token);
}

export async function createTrade(
  _token: string,
  input: CreateTradeInput
): Promise<Trade> {
  if (MOCK_MODE) return mockCreateTrade(input);
  return realCreateTrade(_token, input);
}

export async function deleteTrade(_token: string, id: string): Promise<void> {
  if (MOCK_MODE) {
    const idx = _mockStore.findIndex((t) => t.id === id);
    if (idx !== -1) _mockStore.splice(idx, 1);
    return;
  }
  return realDeleteTrade(_token, id);
}
