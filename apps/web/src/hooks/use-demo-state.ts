"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoState } from "@/lib/demo/types";

export function useDemoState() {
  const [data, setData] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/demo/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DemoState;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchState();
  }, [fetchState]);

  return { data, loading, error, refresh: fetchState };
}

