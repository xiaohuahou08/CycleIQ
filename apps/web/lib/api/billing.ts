const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Add it to apps/web/.env.local (local) or Vercel env (production).",
    );
  }
  return `${API_BASE}${path}`;
}

async function billingFetch(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot reach API at ${API_BASE}. Check that the backend is running and CORS allows this origin.`,
      );
    }
    throw err;
  }
  return res;
}

export interface BillingStatus {
  plan: string;
  plan_label: string;
  price_usd: number | null;
  trades_this_month: number;
  trades_limit: number | null;
  trades_remaining: number | null;
  limit_reached: boolean;
  period_start: string;
  period_end: string;
  subscription_status: string | null;
  current_period_end: string | null;
  can_manage_billing: boolean;
}

export async function syncBillingAfterCheckout(
  token: string,
  sessionId?: string | null,
): Promise<BillingStatus> {
  const res = await billingFetch("/api/billing/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
  });
  if (!res.ok) {
    let detail = `Failed to sync billing (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as BillingStatus;
}

export async function fetchBillingStatus(token: string): Promise<BillingStatus> {
  const res = await billingFetch("/api/billing/status", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load billing status (${res.status})`);
  }
  return (await res.json()) as BillingStatus;
}

export async function createCheckoutSession(token: string): Promise<{ url: string }> {
  const res = await billingFetch("/api/billing/checkout-session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `Failed to start checkout (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as { url: string };
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  const res = await billingFetch("/api/billing/portal-session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `Failed to open billing portal (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as { url: string };
}
