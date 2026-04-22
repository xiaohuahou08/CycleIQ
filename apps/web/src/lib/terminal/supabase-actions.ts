import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CycleRow, CycleState, ExecutionRow, IntentRow, TerminalState } from "@/lib/terminal/types";
import { applyWheelEvent, executeIntent, planNextStepForCycle, retryExecution } from "@/lib/terminal/actions";
import type { WheelEventType } from "@/lib/terminal/actions";
import {
  autoNextIntent,
  generateMarketSnapshot,
  generateOptionChain,
  pickExpiry,
} from "@/lib/terminal/wheel-engine";
import type { WheelStrategyParams, WheelAdvanceAction } from "@/lib/terminal/wheel-engine";

function nowIso() {
  return new Date().toISOString();
}

async function requireAuthedSupabase() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase not configured.");
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Not logged in. Go to /login.");
  return { supabase, userId };
}

function mapCycleRow(c: {
  id: string;
  ticker: string;
  state: CycleRow["state"];
  current_leg: string | null;
  premium_cents: number | null;
  stock_pnl_cents: number | null;
  total_pnl_cents: number | null;
  roll_count: number | null;
  updated_at: string;
}): CycleRow {
  return {
    id: c.id,
    ticker: c.ticker,
    state: c.state,
    currentLeg: c.current_leg ?? null,
    premium: Number(c.premium_cents ?? 0) / 100,
    stockPnl: Number(c.stock_pnl_cents ?? 0) / 100,
    totalPnl: Number(c.total_pnl_cents ?? 0) / 100,
    rollCount: Number(c.roll_count ?? 0),
    updatedAt: c.updated_at,
  };
}

function mapIntentRow(o: {
  id: string;
  created_at: string;
  cycle_id: string;
  ticker: string;
  intent_type: IntentRow["type"];
  legs: string;
  estimated_premium_cents: number | null;
  risk_status: IntentRow["riskStatus"];
  approval_status: IntentRow["approvalStatus"];
}): IntentRow {
  return {
    id: o.id,
    createdAt: o.created_at,
    cycleId: o.cycle_id,
    ticker: o.ticker,
    type: o.intent_type,
    legs: o.legs,
    estimatedPremium: Number(o.estimated_premium_cents ?? 0) / 100,
    riskStatus: o.risk_status,
    approvalStatus: o.approval_status,
  };
}

function mapExecutionRow(x: {
  id: string;
  started_at: string;
  ticker: string;
  intent_id: string;
  oms_status: ExecutionRow["status"];
  broker: ExecutionRow["broker"];
  client_order_id: string;
  external_order_id: string | null;
  updated_at: string;
}): ExecutionRow {
  return {
    id: x.id,
    startedAt: x.started_at,
    ticker: x.ticker,
    intentId: x.intent_id,
    status: x.oms_status,
    broker: x.broker,
    clientOrderId: x.client_order_id,
    externalOrderId: x.external_order_id ?? null,
    lastUpdate: x.updated_at,
  };
}

export async function approveIntents(intentIds: string[]) {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!intentIds.length) return { updated: 0 };

  const { error, data } = await supabase
    .from("order_intents")
    .update({ approval_status: "approved" })
    .eq("user_id", userId)
    .in("id", intentIds)
    .select("id");

  if (error) throw error;
  return { updated: data?.length ?? 0 };
}

export async function createCycle(params: {
  ticker: string;
  state?: CycleState;
  autoCreateFirstIntent?: boolean;
}) {
  const { supabase, userId } = await requireAuthedSupabase();

  const ticker = params.ticker.trim().toUpperCase();
  if (!ticker) throw new Error("Ticker is required.");
  const state: CycleState = params.state ?? "CSP_OPEN";
  const now = nowIso();

  const { data: inserted, error: cycleErr } = await supabase
    .from("cycles")
    .insert([
      {
        user_id: userId,
        ticker,
        state,
        current_leg: state === "CSP_OPEN" ? "PUT (next)" : null,
        premium_cents: 0,
        stock_pnl_cents: 0,
        total_pnl_cents: 0,
        roll_count: 0,
        updated_at: now,
      },
    ])
    .select("id,ticker");

  if (cycleErr) throw cycleErr;
  const cycleId = inserted?.[0]?.id;
  if (!cycleId) throw new Error("Failed to create cycle.");

  let intentId: string | null = null;
  const shouldCreateIntent = params.autoCreateFirstIntent ?? true;
  if (shouldCreateIntent) {
    const { data: intents, error: intentErr } = await supabase
      .from("order_intents")
      .insert([
        {
          user_id: userId,
          cycle_id: cycleId,
          ticker,
          intent_type: "SELL_CSP",
          legs: "SELL PUT (next) x1",
          estimated_premium_cents: 0,
          risk_status: "pass",
          approval_status: "draft",
        },
      ])
      .select("id");

    if (intentErr) throw intentErr;
    intentId = intents?.[0]?.id ?? null;
  }

  return { cycleId, intentId };
}

export async function applyCycleEvent(params: {
  cycleId: string;
  eventType: WheelEventType;
}) {
  const { supabase, userId } = await requireAuthedSupabase();

  const { data: cycles, error: cyclesErr } = await supabase
    .from("cycles")
    .select(
      "id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at"
    )
    .eq("user_id", userId)
    .eq("id", params.cycleId)
    .limit(1);

  if (cyclesErr) throw cyclesErr;
  const row = cycles?.[0];
  if (!row) throw new Error("Cycle not found.");

  const cycle = mapCycleRow(row);
  const { cycle: next, note } = applyWheelEvent(cycle, params.eventType);

  const { error: updateErr } = await supabase
    .from("cycles")
    .update({
      state: next.state,
      current_leg: next.currentLeg,
      roll_count: next.rollCount,
      updated_at: next.updatedAt,
    })
    .eq("user_id", userId)
    .eq("id", next.id);

  if (updateErr) throw updateErr;

  // Log as an execution_event (cycleId carried in payload).
  // execution_id is required by schema; we create a lightweight placeholder execution row
  // so lifecycle events remain queryable without adding new tables in the MVP.
  const { data: placeholderExec, error: placeholderErr } = await supabase
    .from("order_executions")
    .insert([
      {
        user_id: userId,
        intent_id: (await ensurePlaceholderIntentId(supabase, userId, next.id, next.ticker)),
        started_at: next.updatedAt,
        updated_at: next.updatedAt,
        ticker: next.ticker,
        oms_status: "planned",
        broker: "simulated",
        client_order_id: `ci_evt_${params.eventType}_${next.id.slice(0, 8)}`,
        external_order_id: null,
      },
    ])
    .select("id");

  if (!placeholderErr) {
    const execId = placeholderExec?.[0]?.id;
    if (execId) {
      await supabase.from("execution_events").insert([
        {
          user_id: userId,
          execution_id: execId,
          event_type: params.eventType,
          payload: { cycleId: next.id, note },
        },
      ]);
    }
  }

  return { ok: true, note, state: next.state };
}

export async function createWheelCycle(params: {
  ticker: string;
  seed: string;
  asOfDateYmd: string; // YYYY-MM-DD
  strategy: WheelStrategyParams;
}) {
  const { supabase, userId } = await requireAuthedSupabase();

  const ticker = params.ticker.trim().toUpperCase();
  if (!ticker) throw new Error("Ticker is required.");

  // Upsert market snapshot (by user/date/seed unique index)
  const snapshot = generateMarketSnapshot({
    asOfDateYmd: params.asOfDateYmd,
    seed: params.seed,
    tickers: [ticker],
  });

  const { data: snapshots, error: snapErr } = await supabase
    .from("market_snapshots")
    .upsert(
      [
        {
          user_id: userId,
          as_of_date: params.asOfDateYmd,
          seed: params.seed,
          underlyings: snapshot.underlyings,
        },
      ],
      { onConflict: "user_id,as_of_date,seed" }
    )
    .select("id,as_of_date,seed");
  if (snapErr) throw snapErr;
  const snapshotId = snapshots?.[0]?.id;
  if (!snapshotId) throw new Error("Failed to create market snapshot.");

  // Create cycle
  const now = nowIso();
  const { data: cycles, error: cycleErr } = await supabase
    .from("cycles")
    .insert([
      {
        user_id: userId,
        ticker,
        state: "CSP_OPEN",
        current_leg: null,
        premium_cents: 0,
        stock_pnl_cents: 0,
        total_pnl_cents: 0,
        roll_count: 0,
        updated_at: now,
      },
    ])
    .select("id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at");
  if (cycleErr) throw cycleErr;
  const cycleRow = cycles?.[0];
  if (!cycleRow) throw new Error("Failed to create cycle.");
  const cycle = mapCycleRow(cycleRow);

  // Strategy row
  const s = params.strategy;
  const { error: stratErr } = await supabase.from("cycle_strategies").insert([
    {
      user_id: userId,
      cycle_id: cycle.id,
      contracts: s.contracts,
      target_dte: s.targetDte,
      target_delta: s.targetDelta,
      roll_days_before: s.rollDaysBefore,
      take_profit_pct: s.takeProfitPct,
      stop_loss_pct: s.stopLossPct ?? null,
    },
  ]);
  if (stratErr) throw stratErr;

  // Option chains for chosen expiry
  const quote = snapshot.underlyings[ticker];
  const expiry = pickExpiry(snapshot.asOfDate, s.targetDte);
  const putChain = generateOptionChain({
    ticker,
    asOfDateYmd: snapshot.asOfDate,
    seed: snapshot.seed,
    right: "PUT",
    expiryYmd: expiry,
    underlying: quote,
  });
  const callChain = generateOptionChain({
    ticker,
    asOfDateYmd: snapshot.asOfDate,
    seed: snapshot.seed,
    right: "CALL",
    expiryYmd: expiry,
    underlying: quote,
  });

  const { error: chainErr } = await supabase.from("option_chains").insert([
    {
      user_id: userId,
      snapshot_id: snapshotId,
      ticker,
      expiry,
      right: "PUT",
      strikes: putChain.strikes,
    },
    {
      user_id: userId,
      snapshot_id: snapshotId,
      ticker,
      expiry,
      right: "CALL",
      strikes: callChain.strikes,
    },
  ]);
  if (chainErr) throw chainErr;

  // Initial intent from engine (SELL_CSP draft)
  const next = autoNextIntent({
    cycle,
    strategy: s,
    snapshot,
    putChain,
    callChain,
  });
  const { data: intents, error: intentErr } = await supabase
    .from("order_intents")
    .insert([
      {
        user_id: userId,
        cycle_id: cycle.id,
        ticker,
        intent_type: next.intentType,
        legs: next.legs,
        estimated_premium_cents: Math.round(next.estPremium * 100),
        risk_status: "pass",
        approval_status: "draft",
      },
    ])
    .select("id");
  if (intentErr) throw intentErr;
  const intentId = intents?.[0]?.id ?? null;

  return { cycleId: cycle.id, intentId, snapshotId, expiry };
}

export async function executeAndSimulateFill(intentIds: string[]) {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!intentIds.length) return { created: 0 };

  const { data: intents, error: intentsErr } = await supabase
    .from("order_intents")
    .select(
      "id,created_at,cycle_id,ticker,intent_type,legs,estimated_premium_cents,risk_status,approval_status"
    )
    .eq("user_id", userId)
    .in("id", intentIds);
  if (intentsErr) throw intentsErr;

  const now = nowIso();
  const rows =
    intents?.map((o) => {
      const intent = mapIntentRow(o);
      const { execution } = executeIntent(intent, { seedLabel: "autosim" });
      return {
        user_id: userId,
        started_at: now,
        updated_at: now,
        ticker: execution.ticker,
        intent_id: execution.intentId,
        oms_status: "submitted",
        broker: "simulated",
        client_order_id: execution.clientOrderId,
        external_order_id: null,
      };
    }) ?? [];
  if (!rows.length) return { created: 0 };

  const { data: inserted, error: insertErr } = await supabase
    .from("order_executions")
    .insert(rows)
    .select("id");
  if (insertErr) throw insertErr;

  const execIds = inserted?.map((r) => r.id) ?? [];
  if (execIds.length) {
    // Ack then filled (two quick updates)
    await supabase
      .from("order_executions")
      .update({ oms_status: "acked", updated_at: nowIso() })
      .eq("user_id", userId)
      .in("id", execIds);
    await supabase
      .from("order_executions")
      .update({ oms_status: "filled", updated_at: nowIso() })
      .eq("user_id", userId)
      .in("id", execIds);
  }

  return { created: execIds.length };
}

export async function advanceWheel(params: {
  cycleId: string;
  action: WheelAdvanceAction;
  days?: number;
}) {
  const { supabase, userId } = await requireAuthedSupabase();

  const { data: cycles, error: cyclesErr } = await supabase
    .from("cycles")
    .select(
      "id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at"
    )
    .eq("user_id", userId)
    .eq("id", params.cycleId)
    .limit(1);
  if (cyclesErr) throw cyclesErr;
  const row = cycles?.[0];
  if (!row) throw new Error("Cycle not found.");
  const cycle = mapCycleRow(row);

  const eventType: WheelEventType =
    params.action === "expire_otm"
      ? cycle.state === "CSP_OPEN"
        ? "CSP_EXPIRE_OTM"
        : "CC_EXPIRE_OTM"
      : params.action === "assigned"
      ? "CSP_ASSIGNED"
      : "CC_ASSIGNED";

  const { cycle: next, note } = applyWheelEvent(cycle, eventType);

  const { error: updateErr } = await supabase
    .from("cycles")
    .update({
      state: next.state,
      current_leg: next.currentLeg,
      roll_count: next.rollCount,
      updated_at: next.updatedAt,
    })
    .eq("user_id", userId)
    .eq("id", next.id);
  if (updateErr) throw updateErr;

  await supabase.from("wheel_events").insert([
    {
      user_id: userId,
      cycle_id: next.id,
      event_type: eventType,
      payload: { note, action: params.action, days: params.days ?? 0 },
    },
  ]);

  // Auto-create next recommended intent (needs strategy + market + chains)
  const { data: strat, error: stratErr } = await supabase
    .from("cycle_strategies")
    .select("contracts,target_dte,target_delta,roll_days_before,take_profit_pct,stop_loss_pct")
    .eq("user_id", userId)
    .eq("cycle_id", next.id)
    .limit(1);
  if (stratErr) throw stratErr;
  const srow = strat?.[0];
  if (!srow) return { ok: true, eventType, note, nextState: next.state };

  const strategy: WheelStrategyParams = {
    contracts: Number(srow.contracts ?? 1),
    targetDte: Number(srow.target_dte ?? 30),
    targetDelta: Number(srow.target_delta ?? 0.25),
    rollDaysBefore: Number(srow.roll_days_before ?? 7),
    takeProfitPct: Number(srow.take_profit_pct ?? 0.5),
    stopLossPct: srow.stop_loss_pct === null ? undefined : Number(srow.stop_loss_pct),
  };

  // Latest snapshot for user (simple)
  const { data: snaps, error: snapErr } = await supabase
    .from("market_snapshots")
    .select("id,as_of_date,seed,underlyings")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (snapErr) throw snapErr;
  const snap = snaps?.[0];
  if (!snap) return { ok: true, eventType, note, nextState: next.state };

  const snapshot = {
    asOfDate: String(snap.as_of_date),
    seed: String(snap.seed),
    underlyings: snap.underlyings as Record<string, { price: number; iv: number }>,
  };

  const expiry = pickExpiry(snapshot.asOfDate, strategy.targetDte);
  const { data: chains, error: chainErr } = await supabase
    .from("option_chains")
    .select("right,strikes,expiry,ticker")
    .eq("user_id", userId)
    .eq("snapshot_id", snap.id)
    .eq("ticker", next.ticker)
    .eq("expiry", expiry);
  if (chainErr) throw chainErr;
  const put = chains?.find((c) => c.right === "PUT");
  const call = chains?.find((c) => c.right === "CALL");
  if (!put || !call) return { ok: true, eventType, note, nextState: next.state };

  const putChain = {
    ticker: next.ticker,
    expiry,
    right: "PUT" as const,
    strikes: put.strikes as Record<string, { delta: number; mid: number; iv: number }>,
  };
  const callChain = {
    ticker: next.ticker,
    expiry,
    right: "CALL" as const,
    strikes: call.strikes as Record<string, { delta: number; mid: number; iv: number }>,
  };

  const nextIntent = autoNextIntent({
    cycle: next,
    strategy,
    snapshot,
    putChain,
    callChain,
  });

  const { data: intents, error: intentErr } = await supabase
    .from("order_intents")
    .insert([
      {
        user_id: userId,
        cycle_id: next.id,
        ticker: next.ticker,
        intent_type: nextIntent.intentType,
        legs: nextIntent.legs,
        estimated_premium_cents: Math.round(nextIntent.estPremium * 100),
        risk_status: "pass",
        approval_status: "draft",
      },
    ])
    .select("id");
  if (intentErr) throw intentErr;

  return {
    ok: true,
    eventType,
    note,
    nextState: next.state,
    nextIntentId: intents?.[0]?.id ?? null,
  };
}

async function ensurePlaceholderIntentId(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string,
  ticker: string
) {
  const { data: intents, error } = await supabase
    .from("order_intents")
    .select("id")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const existing = intents?.[0]?.id;
  if (existing) return existing;

  const { data: inserted, error: insertErr } = await supabase
    .from("order_intents")
    .insert([
      {
        user_id: userId,
        cycle_id: cycleId,
        ticker,
        intent_type: "EXIT",
        legs: "EVENT PLACEHOLDER",
        estimated_premium_cents: 0,
        risk_status: "pass",
        approval_status: "approved",
      },
    ])
    .select("id");

  if (insertErr) throw insertErr;
  const id = inserted?.[0]?.id;
  if (!id) throw new Error("Failed to create placeholder intent.");
  return id;
}

export async function planCycles(cycleIds: string[], seedLabel = "plan") {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!cycleIds.length) return { created: 0 };

  const { data: cycles, error: cyclesErr } = await supabase
    .from("cycles")
    .select(
      "id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at"
    )
    .eq("user_id", userId)
    .in("id", cycleIds);

  if (cyclesErr) throw cyclesErr;

  const intentsToInsert =
    cycles?.map((c) => {
      const cycle = mapCycleRow(c);
      const { intent } = planNextStepForCycle(cycle, { seedLabel });
      return {
        user_id: userId,
        created_at: nowIso(),
        cycle_id: intent.cycleId,
        ticker: intent.ticker,
        intent_type: intent.type,
        legs: intent.legs,
        estimated_premium_cents: Math.round((intent.estimatedPremium ?? 0) * 100),
        risk_status: intent.riskStatus,
        approval_status: intent.approvalStatus,
      };
    }) ?? [];

  if (!intentsToInsert.length) return { created: 0 };

  const { error: insertErr, data: inserted } = await supabase
    .from("order_intents")
    .insert(intentsToInsert)
    .select("id");

  if (insertErr) throw insertErr;
  return { created: inserted?.length ?? intentsToInsert.length };
}

export async function executeIntents(intentIds: string[], seedLabel = "dryrun") {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!intentIds.length) return { created: 0 };

  const { data: intents, error: intentsErr } = await supabase
    .from("order_intents")
    .select(
      "id,created_at,cycle_id,ticker,intent_type,legs,estimated_premium_cents,risk_status,approval_status"
    )
    .eq("user_id", userId)
    .in("id", intentIds);

  if (intentsErr) throw intentsErr;

  const rows =
    intents?.map((o) => {
      const intent = mapIntentRow(o);
      const { execution } = executeIntent(intent, { seedLabel });
      return {
        user_id: userId,
        started_at: execution.startedAt,
        ticker: execution.ticker,
        intent_id: execution.intentId,
        oms_status: execution.status,
        broker: execution.broker,
        client_order_id: execution.clientOrderId,
        external_order_id: execution.externalOrderId,
        updated_at: execution.lastUpdate,
      };
    }) ?? [];

  if (!rows.length) return { created: 0 };

  const { data: inserted, error: insertErr } = await supabase
    .from("order_executions")
    .insert(rows)
    .select("id");

  if (insertErr) throw insertErr;

  // Best-effort audit rows if table exists + policy allows it.
  const execIds = inserted?.map((r) => r.id) ?? [];
  if (execIds.length) {
    await supabase.from("execution_events").insert(
      execIds.map((executionId) => ({
        user_id: userId,
        execution_id: executionId,
        event_type: "ACK",
        payload: { note: "Simulated ack" },
      }))
    );
  }

  return { created: inserted?.length ?? rows.length };
}

export async function cancelExecutions(executionIds: string[]) {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!executionIds.length) return { updated: 0 };

  const { data, error } = await supabase
    .from("order_executions")
    .update({ oms_status: "canceled", updated_at: nowIso() })
    .eq("user_id", userId)
    .in("id", executionIds)
    .select("id");

  if (error) throw error;
  return { updated: data?.length ?? 0 };
}

export async function retryExecutions(executionIds: string[], seedLabel = "retry") {
  const { supabase, userId } = await requireAuthedSupabase();
  if (!executionIds.length) return { created: 0 };

  const { data: execs, error: execErr } = await supabase
    .from("order_executions")
    .select(
      "id,started_at,ticker,intent_id,oms_status,broker,client_order_id,external_order_id,updated_at"
    )
    .eq("user_id", userId)
    .in("id", executionIds);

  if (execErr) throw execErr;

  const rows =
    execs?.map((x) => {
      const ex = mapExecutionRow(x);
      const next = retryExecution(ex, { seedLabel });
      return {
        user_id: userId,
        started_at: next.startedAt,
        ticker: next.ticker,
        intent_id: next.intentId,
        oms_status: next.status,
        broker: next.broker,
        client_order_id: next.clientOrderId,
        external_order_id: next.externalOrderId,
        updated_at: next.lastUpdate,
      };
    }) ?? [];

  if (!rows.length) return { created: 0 };

  const { data: inserted, error: insertErr } = await supabase
    .from("order_executions")
    .insert(rows)
    .select("id");

  if (insertErr) throw insertErr;
  return { created: inserted?.length ?? rows.length };
}

export async function fetchTerminalStateSupabase(): Promise<TerminalState> {
  const { supabase, userId } = await requireAuthedSupabase();

  const [cyclesRes, intentsRes, execRes] = await Promise.all([
    supabase
      .from("cycles")
      .select(
        "id,ticker,state,current_leg,premium_cents,stock_pnl_cents,total_pnl_cents,roll_count,updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("order_intents")
      .select(
        "id,created_at,cycle_id,ticker,intent_type,legs,estimated_premium_cents,risk_status,approval_status"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_executions")
      .select(
        "id,started_at,ticker,intent_id,oms_status,broker,client_order_id,external_order_id,updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);

  if (cyclesRes.error) throw cyclesRes.error;
  if (intentsRes.error) throw intentsRes.error;
  if (execRes.error) throw execRes.error;

  return {
    cycles: cyclesRes.data?.map(mapCycleRow) ?? [],
    intents: intentsRes.data?.map(mapIntentRow) ?? [],
    executions: execRes.data?.map(mapExecutionRow) ?? [],
  };
}

export async function fetchLatestMarketSnapshot() {
  const { supabase, userId } = await requireAuthedSupabase();
  const { data, error } = await supabase
    .from("market_snapshots")
    .select("id,as_of_date,seed,underlyings,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

