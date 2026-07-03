"use client";

import { useEffect, useState } from "react";

const DEFAULT_PHASES = [
  { afterMs: 0, message: "Refreshing data…" },
  { afterMs: 3000, message: "Still connecting to server…" },
  { afterMs: 8000, message: "Taking longer than usual. Please wait…" },
] as const;

export function useSlowLoadingMessage(
  active: boolean,
  phases: readonly { afterMs: number; message: string }[] = DEFAULT_PHASES
): string {
  const [message, setMessage] = useState(phases[0]?.message ?? "Loading…");

  useEffect(() => {
    if (!active) {
      setMessage(phases[0]?.message ?? "Loading…");
      return;
    }

    const startedAt = Date.now();
    setMessage(phases[0]?.message ?? "Loading…");

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      let next = phases[0]?.message ?? "Loading…";
      for (const phase of phases) {
        if (elapsed >= phase.afterMs) next = phase.message;
      }
      setMessage(next);
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [active, phases]);

  return message;
}

export const APP_LOADING_PHASES = [
  { afterMs: 0, message: "Loading your workspace…" },
  { afterMs: 3000, message: "Connecting to CycleIQ…" },
  { afterMs: 8000, message: "Almost there…" },
] as const;

export const AUTH_LOADING_PHASES = [
  { afterMs: 0, message: "Loading…" },
  { afterMs: 3000, message: "Connecting to CycleIQ…" },
  { afterMs: 8000, message: "Almost there…" },
] as const;
