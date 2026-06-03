"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cycleiq:trade_defaults";
export const TRADE_DEFAULTS_UPDATED_EVENT = "cycleiq:trade_defaults_updated";

export interface TradeDefaults {
  /** Commission per contract in dollars (e.g. 0.65). Undefined = no default. */
  commissionPerContract?: number;
  /** Default number of contracts (e.g. 1). */
  defaultContracts: number;
  /** Default days-to-expiry used to pre-compute the expiry date (e.g. 45). */
  defaultDte: number;
}

const INITIAL_DEFAULTS: TradeDefaults = {
  commissionPerContract: undefined,
  defaultContracts: 1,
  defaultDte: 45,
};

function load(): TradeDefaults {
  if (typeof window === "undefined") return INITIAL_DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEFAULTS;
    return { ...INITIAL_DEFAULTS, ...JSON.parse(raw) } as TradeDefaults;
  } catch {
    return INITIAL_DEFAULTS;
  }
}

function save(defaults: TradeDefaults): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // storage may be unavailable in some contexts
  }
}

/** Total opening commission for the leg (stored as `commission_fee` on the trade). */
export function commissionFeeTotal(
  perContract: number | undefined,
  contracts: number
): number | undefined {
  if (perContract === undefined || !Number.isFinite(perContract)) return undefined;
  const c = Math.max(1, Math.floor(Number(contracts)) || 1);
  return Math.round(perContract * c * 100) / 100;
}

export function useTradeDefaults() {
  const [defaults, setDefaultsState] = useState<TradeDefaults>(() =>
    typeof window === "undefined" ? INITIAL_DEFAULTS : load()
  );

  useEffect(() => {
    const refresh = () => setDefaultsState(load());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(TRADE_DEFAULTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TRADE_DEFAULTS_UPDATED_EVENT, refresh);
    };
  }, []);

  const setDefaults = useCallback((next: TradeDefaults) => {
    save(next);
    setDefaultsState(next);
    window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
  }, []);

  return { defaults, setDefaults, commissionFeeTotal };
}
