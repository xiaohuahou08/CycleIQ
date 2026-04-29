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
  cycle_id?: string | null;
  option_type: "PUT" | "CALL";
  strike: number;
  expiry: string;
  trade_date: string;
  premium: number;
  commission_fee?: number | null;
  contracts: number;
  delta?: number;
  status: TradeStatus;
  expired_at?: string | null;
  expire_type?: "EXPIRED_WORTHLESS" | "EXPIRED_ITM" | null;
  notes?: string;
}

export interface CreateTradeInput {
  ticker: string;
  option_type: "PUT" | "CALL";
  strike: number;
  expiry: string;
  trade_date: string;
  premium: number;
  commission_fee?: number;
  contracts: number;
  delta?: number;
  status: TradeStatus;
  notes?: string;
}

export type UpdateTradeInput = Partial<CreateTradeInput>;

export interface MetricsSummary {
  total_premium: number;
  annualized_return: number;
  active_positions: number;
  win_rate: number;
}

export interface DashboardSeriesPoint {
  label: string;
  value: number;
}

export interface DashboardInsights {
  kpis: {
    total_capital_invested: number;
    total_premium: number;
    realized_pnl: number;
    avg_annual_roi: number;
    active_trades: number;
    win_rate: number;
    avg_premium_per_active_day: number;
    active_days: number;
    yearly_income: number;
    daily_avg_income: number;
  };
  charts: {
    daily_premium_income: DashboardSeriesPoint[];
    weekly_premium_income: DashboardSeriesPoint[];
    monthly_premium_income: DashboardSeriesPoint[];
  };
}

export interface CycleTransitionInput {
  event: "expire_otm" | "assigned" | "roll";
  params?: Record<string, unknown>;
}

export interface ExpireTradeInput {
  expired_at: string;
  expire_type?: "expired_worthless" | "expired_itm";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    const detail = data.error || data.message;
    if (detail) return `${fallback}: ${detail}`;
  } catch {
    // Ignore JSON parse failures and fallback to plain status.
  }
  return `${fallback}: ${res.status}`;
}

async function realListTrades(token: string, params?: { status?: string }): Promise<Trade[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const url = qs.size ? `${API_BASE}/api/trades?${qs}` : `${API_BASE}/api/trades`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load trades"));
  const data = (await res.json()) as Trade[] | { trades: Trade[]; total: number };
  if (Array.isArray(data)) return data;
  return data.trades ?? [];
}

async function realGetMetricsSummary(token: string): Promise<MetricsSummary> {
  const res = await fetch(`${API_BASE}/api/metrics/summary`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load metrics"));
  return res.json() as Promise<MetricsSummary>;
}

async function realGetDashboardInsights(token: string): Promise<DashboardInsights> {
  const res = await fetch(`${API_BASE}/api/dashboard/insights`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load dashboard insights"));
  return res.json() as Promise<DashboardInsights>;
}

async function realCreateTrade(token: string, input: CreateTradeInput): Promise<Trade> {
  const res = await fetch(`${API_BASE}/api/trades`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to create trade"));
  return res.json() as Promise<Trade>;
}

async function realDeleteTrade(_token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/trades/${id}`, {
    method: "DELETE",
    headers: authHeaders(_token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to delete trade"));
}

async function realUpdateTrade(
  token: string,
  id: string,
  input: UpdateTradeInput
): Promise<Trade> {
  const res = await fetch(`${API_BASE}/api/trades/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to update trade"));
  return res.json() as Promise<Trade>;
}

async function realPostCycleTransition(
  token: string,
  cycleId: string,
  input: CycleTransitionInput
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cycles/${cycleId}/transitions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to apply cycle transition"));
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

export async function getDashboardInsights(_token: string): Promise<DashboardInsights> {
  return realGetDashboardInsights(_token);
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

export async function updateTrade(
  _token: string,
  id: string,
  input: UpdateTradeInput
): Promise<Trade> {
  return realUpdateTrade(_token, id, input);
}

export async function postCycleTransition(
  _token: string,
  cycleId: string,
  input: CycleTransitionInput
): Promise<void> {
  return realPostCycleTransition(_token, cycleId, input);
}

export async function expireTrade(
  _token: string,
  id: string,
  input: ExpireTradeInput
): Promise<Trade> {
  const res = await fetch(`${API_BASE}/api/trades/${id}/expire`, {
    method: "PATCH",
    headers: authHeaders(_token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to expire trade"));
  return res.json() as Promise<Trade>;
}
