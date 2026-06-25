"use client";

import { useCallback, useEffect, useState } from "react";
import { useProtectedAuth } from "@/app/(protected)/auth-context";
import { getTradeDefaults, updateTradeDefaults } from "@/lib/api/preferences";
import { commissionFeeTotal } from "@/lib/trades/commissionFee";

const STORAGE_KEY = "cycleiq:trade_defaults";
export const TRADE_DEFAULTS_UPDATED_EVENT = "cycleiq:trade_defaults_updated";

export interface TradeDefaults {
  /** Commission per contract in dollars (e.g. 0.65). Undefined = no default. */
  commissionPerContract?: number;
  /** Default number of contracts (e.g. 1). */
  defaultContracts: number;
  /** Default days-to-expiry used to pre-compute the expiry date (e.g. 45). */
  defaultDte: number;
  /** Max cash-secured notional for open CSP legs (strike × shares). */
  totalCapitalBudget: number;
}

export const INITIAL_DEFAULTS: TradeDefaults = {
  commissionPerContract: undefined,
  defaultContracts: 1,
  defaultDte: 45,
  totalCapitalBudget: 10000,
};

function loadLocal(): TradeDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...INITIAL_DEFAULTS, ...JSON.parse(raw) } as TradeDefaults;
  } catch {
    return null;
  }
}

function clearLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useTradeDefaults() {
  const { token } = useProtectedAuth();
  const [defaults, setDefaultsState] = useState<TradeDefaults>(INITIAL_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setDefaultsState(loadLocal() ?? INITIAL_DEFAULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let fromApi = await getTradeDefaults(token);
      const local = loadLocal();
      if (local) {
        fromApi = await updateTradeDefaults(token, local);
        clearLocal();
      }
      setDefaultsState(fromApi);
    } catch {
      setDefaultsState(loadLocal() ?? INITIAL_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => void refresh();
    window.addEventListener(TRADE_DEFAULTS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(TRADE_DEFAULTS_UPDATED_EVENT, onUpdated);
  }, [refresh]);

  const setDefaults = useCallback(
    async (next: TradeDefaults) => {
      if (!token) {
        setDefaultsState(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
        return;
      }

      setSaving(true);
      try {
        const saved = await updateTradeDefaults(token, next);
        setDefaultsState(saved);
        window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
      } catch (err) {
        await refresh();
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [token, refresh]
  );

  return { defaults, setDefaults, commissionFeeTotal, loading, saving };
}

export { commissionFeeTotal };
