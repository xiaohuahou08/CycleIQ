import { getApiBase } from "@/lib/api/base";

export interface ResetTradingDataResult {
  trades_deleted: number;
  cycles_deleted: number;
}

export async function resetTradingData(token: string): Promise<ResetTradingDataResult> {
  const res = await fetch(`${getApiBase()}/api/me/reset-trading-data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    let detail = `Failed to reset trading data (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as ResetTradingDataResult;
}
