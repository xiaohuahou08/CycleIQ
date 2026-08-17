import type { TradeDefaults } from "@/lib/hooks/useTradeDefaults";

import { apiFetch } from "@/lib/api/base";

export interface ScreenerConfigApi {
  watchlist: string[];
  min_dte: number;
  max_dte: number;
  min_net_premium_usd: number;
  min_annualized_return: number;
  min_iv_rv_ratio: number;
  min_iv_minus_rv: number;
  max_spread_ratio: number;
  put_recall_below_pct: number;
  call_recall_above_pct: number;
  call_cost_floor_mult: number;
  earnings_hard_window_days: number;
  return_proximity_band: number;
  fee_per_contract_usd: number | null;
}

export interface TradeDefaultsApi {
  commission_per_contract: number | null;
  default_contracts: number;
  default_dte: number;
  total_capital_budget: number;
  screener_config?: ScreenerConfigApi;
}

export const DEFAULT_SCREENER_CONFIG: ScreenerConfigApi = {
  watchlist: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"],
  min_dte: 21,
  max_dte: 45,
  min_net_premium_usd: 0.1,
  min_annualized_return: 0,
  min_iv_rv_ratio: 0,
  min_iv_minus_rv: 0,
  max_spread_ratio: 0.5,
  put_recall_below_pct: 0.25,
  call_recall_above_pct: 0.25,
  call_cost_floor_mult: 1.02,
  earnings_hard_window_days: 0,
  return_proximity_band: 0.002,
  fee_per_contract_usd: null,
};

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
    if (detail) return detail;
  } catch {
    // ignore
  }
  return `${fallback}: ${res.status}`;
}

export function apiToTradeDefaults(data: TradeDefaultsApi): TradeDefaults {
  return {
    commissionPerContract:
      data.commission_per_contract != null ? data.commission_per_contract : undefined,
    defaultContracts: data.default_contracts,
    defaultDte: data.default_dte,
    totalCapitalBudget: data.total_capital_budget,
  };
}

export function tradeDefaultsToApi(defaults: TradeDefaults): TradeDefaultsApi {
  return {
    commission_per_contract:
      defaults.commissionPerContract !== undefined ? defaults.commissionPerContract : null,
    default_contracts: defaults.defaultContracts,
    default_dte: defaults.defaultDte,
    total_capital_budget: defaults.totalCapitalBudget,
  };
}

export async function getTradeDefaults(token: string): Promise<TradeDefaults> {
  const res = await apiFetch(`/api/me/preferences`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load trading defaults"));
  const data = (await res.json()) as TradeDefaultsApi;
  return apiToTradeDefaults(data);
}

export async function updateTradeDefaults(
  token: string,
  defaults: TradeDefaults
): Promise<TradeDefaults> {
  const res = await apiFetch(`/api/me/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(tradeDefaultsToApi(defaults)),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to save trading defaults"));
  const data = (await res.json()) as TradeDefaultsApi;
  return apiToTradeDefaults(data);
}

export async function getScreenerConfig(token: string): Promise<ScreenerConfigApi> {
  const res = await apiFetch(`/api/me/preferences`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load screener config"));
  const data = (await res.json()) as TradeDefaultsApi;
  return { ...DEFAULT_SCREENER_CONFIG, ...(data.screener_config ?? {}) };
}

export async function updateScreenerConfig(
  token: string,
  config: ScreenerConfigApi,
  tradeDefaults?: TradeDefaults
): Promise<ScreenerConfigApi> {
  const base = tradeDefaults
    ? tradeDefaultsToApi(tradeDefaults)
    : await (async () => {
        const res = await apiFetch(`/api/me/preferences`, { headers: authHeaders(token) });
        if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load preferences"));
        return (await res.json()) as TradeDefaultsApi;
      })();

  const res = await apiFetch(`/api/me/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      commission_per_contract: base.commission_per_contract,
      default_contracts: base.default_contracts,
      default_dte: base.default_dte,
      total_capital_budget: base.total_capital_budget,
      screener_config: config,
    }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to save screener config"));
  const data = (await res.json()) as TradeDefaultsApi;
  return { ...DEFAULT_SCREENER_CONFIG, ...(data.screener_config ?? {}) };
}
