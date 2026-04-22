"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { TerminalState } from "@/lib/terminal/types";

export function useTerminalData() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [data, setData] = useState<TerminalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        const next = window.location.pathname;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        const next = window.location.pathname;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const [cyclesRes, intentsRes, execRes] = await Promise.all([
        supabase
          .from("cycles")
          .select(
            "id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at"
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("order_intents")
          .select(
            "id,created_at,cycle_id,ticker,intent_type,legs,estimated_premium_cents,risk_status,approval_status"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("order_executions")
          .select(
            "id,started_at,ticker,intent_id,oms_status,broker,client_order_id,external_order_id,updated_at"
          )
          .order("updated_at", { ascending: false }),
      ]);

      if (cyclesRes.error) throw cyclesRes.error;
      if (intentsRes.error) throw intentsRes.error;
      if (execRes.error) throw execRes.error;

      const mapped: TerminalState = {
        cycles:
          cyclesRes.data?.map((c) => ({
            id: c.id,
            ticker: c.ticker,
            state: c.state,
            currentLeg: c.current_leg ?? null,
            premium: Number(c.premium_cents ?? 0) / 100,
            stockPnl: Number(c.stock_pnl_cents ?? 0) / 100,
            totalPnl: Number(c.total_pnl_cents ?? 0) / 100,
            rollCount: Number(c.roll_count ?? 0),
            updatedAt: c.updated_at,
          })) ?? [],
        intents:
          intentsRes.data?.map((o) => ({
            id: o.id,
            createdAt: o.created_at,
            cycleId: o.cycle_id,
            ticker: o.ticker,
            type: o.intent_type,
            legs: o.legs,
            estimatedPremium: Number(o.estimated_premium_cents ?? 0) / 100,
            riskStatus: o.risk_status,
            approvalStatus: o.approval_status,
          })) ?? [],
        executions:
          execRes.data?.map((x) => ({
            id: x.id,
            startedAt: x.started_at,
            ticker: x.ticker,
            intentId: x.intent_id,
            status: x.oms_status,
            broker: x.broker,
            clientOrderId: x.client_order_id,
            externalOrderId: x.external_order_id ?? null,
            lastUpdate: x.updated_at,
          })) ?? [],
      };

      setData(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
