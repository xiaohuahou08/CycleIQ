"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useDataMode } from "@/hooks/use-data-mode";
import { useTerminalData } from "@/hooks/use-terminal-data";

export default function SettingsPage() {
  const { mode, setMode } = useDataMode();
  const { data, refresh, error } = useTerminalData(mode);
  const [busy, setBusy] = useState<"seed" | "reset" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function seedSupabase() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase not configured.");
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error("Not logged in. Go to /login.");

    const now = new Date().toISOString();
    const { data: cycles, error: cyclesErr } = await supabase
      .from("cycles")
      .insert([
        {
          user_id: userId,
          ticker: "AAPL",
          state: "CSP_OPEN",
          current_leg: "PUT 180 2026-05-17",
          premium_cents: 25000,
          stock_pnl_cents: 0,
          total_pnl_cents: 25000,
          roll_count: 0,
          updated_at: now,
        },
        {
          user_id: userId,
          ticker: "TSLA",
          state: "CC_OPEN",
          current_leg: "CALL 210 2026-06-21",
          premium_cents: 50000,
          stock_pnl_cents: 100000,
          total_pnl_cents: 150000,
          roll_count: 1,
          updated_at: now,
        },
      ])
      .select("id,ticker");
    if (cyclesErr) throw cyclesErr;

    const aapl = cycles?.find((c) => c.ticker === "AAPL")?.id;
    const tsla = cycles?.find((c) => c.ticker === "TSLA")?.id;
    if (!aapl || !tsla) throw new Error("Seed error: missing cycle ids.");

    const { data: intents, error: intentsErr } = await supabase
      .from("order_intents")
      .insert([
        {
          user_id: userId,
          cycle_id: aapl,
          ticker: "AAPL",
          intent_type: "SELL_CSP",
          legs: "SELL PUT 180 2026-05-17 x1",
          estimated_premium_cents: 25000,
          risk_status: "pass",
          approval_status: "pending",
        },
        {
          user_id: userId,
          cycle_id: tsla,
          ticker: "TSLA",
          intent_type: "CC_ROLL",
          legs: "BUY CALL 210 2026-06-21 x1; SELL CALL 215 2026-07-19 x1",
          estimated_premium_cents: 12000,
          risk_status: "warn",
          approval_status: "approved",
        },
      ])
      .select("id, ticker");
    if (intentsErr) throw intentsErr;

    const tslaIntent = intents?.find((i) => i.ticker === "TSLA")?.id;
    if (!tslaIntent) throw new Error("Seed error: missing intent id.");

    const { data: execs, error: execErr } = await supabase
      .from("order_executions")
      .insert([
        {
          user_id: userId,
          intent_id: tslaIntent,
          ticker: "TSLA",
          oms_status: "acked",
          broker: "simulated",
          client_order_id: `ci_seed_${tslaIntent.slice(0, 8)}`,
          external_order_id: null,
          updated_at: now,
        },
      ])
      .select("id");
    if (execErr) throw execErr;

    const execId = execs?.[0]?.id;
    if (execId) {
      await supabase.from("execution_events").insert([
        {
          user_id: userId,
          execution_id: execId,
          event_type: "ACK",
          payload: { note: "Simulated ack" },
        },
      ]);
    }
  }

  async function resetSupabase() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase not configured.");
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error("Not logged in. Go to /login.");

    // order matters because of FK constraints
    await supabase.from("execution_events").delete().eq("user_id", userId);
    await supabase.from("order_executions").delete().eq("user_id", userId);
    await supabase.from("order_intents").delete().eq("user_id", userId);
    await supabase.from("cycles").delete().eq("user_id", userId);
  }

  async function callDev(endpoint: "seed" | "reset") {
    setBusy(endpoint);
    setMessage(null);
    try {
      if (mode === "memory") {
        const res = await fetch(`/api/dev/${endpoint}`, { method: "POST" });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
      } else {
        if (endpoint === "seed") await seedSupabase();
        else await resetSupabase();
      }
      await refresh();
      setMessage(endpoint === "seed" ? "Seeded demo data." : "Reset demo data.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-[color:var(--muted)]">System</div>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel title="Theme" subtitle="Dark/light/system + presets (MVP)">
          <div className="text-sm text-[color:var(--muted)]">
            Theme controls are available in the top-left toggle. Per-user
            preferences will be stored in Supabase.
          </div>
        </Panel>

        <Panel title="Data mode" subtitle="Default: Supabase. Switch manually to Memory.">
          <div className="text-sm text-[color:var(--muted)]">
            Supabase mode reads/writes your remote database (requires keys + login).
            Memory mode is local-only and uses dev seed/reset routes.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ModeButton
              active={mode === "supabase"}
              label="Supabase"
              onClick={() => setMode("supabase")}
            />
            <ModeButton
              active={mode === "memory"}
              label="Memory"
              onClick={() => setMode("memory")}
            />
          </div>
          {error ? (
            <div className="mt-2 text-xs text-[color:var(--muted)]">{error}</div>
          ) : null}
        </Panel>

        <Panel
          title="Demo data"
          subtitle={mode === "memory" ? "Seed/reset via dev routes" : "Seed/reset into Supabase"}
        >
          <div className="text-sm text-[color:var(--muted)]">
            {mode === "memory"
              ? "Uses dev routes to seed deterministic in-memory demo data for the terminal UI."
              : "Seeds deterministic demo rows into your Supabase tables (requires login)."}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-sm disabled:opacity-60"
              onClick={() => void callDev("seed")}
              disabled={busy !== null}
            >
              {busy === "seed" ? "Seeding…" : "Seed demo"}
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-sm disabled:opacity-60"
              onClick={() => void callDev("reset")}
              disabled={busy !== null}
            >
              {busy === "reset" ? "Resetting…" : "Reset"}
            </button>
          </div>
          <div className="mt-2 text-xs text-[color:var(--muted)]">
            {mode === "memory" ? (
              <>
                (Buttons call <code>/api/dev/seed</code> and <code>/api/dev/reset</code>{" "}
                when enabled.)
              </>
            ) : (
              <>
                (Buttons write to Supabase tables <code>cycles</code>, <code>order_intents</code>,{" "}
                <code>order_executions</code>.)
              </>
            )}
          </div>
          {message ? (
            <div className="mt-2 text-xs text-[color:var(--muted)]">
              {message}
            </div>
          ) : null}
          <div className="mt-3 text-xs text-[color:var(--muted)]">
            Seeded at: {data?.seededAt ?? "—"}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`px-3 py-2 rounded-lg border text-sm ${
        active
          ? "border-border bg-[color:var(--panel-2)]"
          : "border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)]">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--muted)]">{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

