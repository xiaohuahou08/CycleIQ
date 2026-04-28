// Trade API client (always uses backend API).

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

export async function listTrades(
  _token: string,
  params?: { status?: string }
): Promise<Trade[]> {
  return realListTrades(_token, params);
}

export async function getMetricsSummary(_token: string): Promise<MetricsSummary> {
  return realGetMetricsSummary(_token);
}

export async function createTrade(
  _token: string,
  input: CreateTradeInput
): Promise<Trade> {
  return realCreateTrade(_token, input);
}

export async function deleteTrade(_token: string, id: string): Promise<void> {
  return realDeleteTrade(_token, id);
}
