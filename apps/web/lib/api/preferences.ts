import type { TradeDefaults } from "@/lib/hooks/useTradeDefaults";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface TradeDefaultsApi {
  commission_per_contract: number | null;
  default_contracts: number;
  default_dte: number;
  total_capital_budget: number;
}

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
  const res = await fetch(`${API_BASE}/api/me/preferences`, {
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
  const res = await fetch(`${API_BASE}/api/me/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(tradeDefaultsToApi(defaults)),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to save trading defaults"));
  const data = (await res.json()) as TradeDefaultsApi;
  return apiToTradeDefaults(data);
}
