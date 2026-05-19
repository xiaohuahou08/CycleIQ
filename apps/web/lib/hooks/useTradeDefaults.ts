"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cycleiq:trade_defaults";

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

export function useTradeDefaults() {
  const [defaults, setDefaultsState] = useState<TradeDefaults>(INITIAL_DEFAULTS);

  useEffect(() => {
    setDefaultsState(load());
  }, []);

  const setDefaults = useCallback((next: TradeDefaults) => {
    save(next);
    setDefaultsState(next);
  }, []);

  return { defaults, setDefaults };
}
