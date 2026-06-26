const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface CapitalFlow {
  id: string;
  event_date: string;
  amount: number;
  type: "deposit" | "withdrawal";
  created_at: string;
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

export async function getCapitalFlows(token: string): Promise<CapitalFlow[]> {
  const res = await fetch(`${API_BASE}/api/me/capital-flows`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to load capital flows"));
  const data = (await res.json()) as { flows: CapitalFlow[] };
  return data.flows;
}

export async function createCapitalFlow(
  token: string,
  payload: { type: "deposit" | "withdrawal"; amount: number; event_date: string }
): Promise<CapitalFlow> {
  const res = await fetch(`${API_BASE}/api/me/capital-flows`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to record capital flow"));
  return (await res.json()) as CapitalFlow;
}

export async function deleteCapitalFlow(token: string, flowId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/me/capital-flows/${flowId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to delete capital flow"));
}

export function formatFlowAmount(amount: number): string {
  const abs = Math.abs(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
}
