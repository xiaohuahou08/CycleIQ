import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { createDemoCycle } from "@/lib/demo/store";
import type { CycleState } from "@/lib/demo/types";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { ticker?: unknown; state?: unknown; autoCreateFirstIntent?: unknown }
    | null;

  const ticker = typeof json?.ticker === "string" ? json.ticker.trim() : "";
  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  const stateRaw = typeof json?.state === "string" ? json.state : undefined;
  const state: CycleState | undefined =
    stateRaw === "IDLE" ||
    stateRaw === "CSP_OPEN" ||
    stateRaw === "CSP_CLOSED" ||
    stateRaw === "STOCK_HELD" ||
    stateRaw === "CC_OPEN" ||
    stateRaw === "EXIT"
      ? stateRaw
      : undefined;
  const autoCreateFirstIntent =
    typeof json?.autoCreateFirstIntent === "boolean"
      ? json.autoCreateFirstIntent
      : true;

  const { cycleId, intentId } = createDemoCycle({
    ticker,
    state,
    autoCreateFirstIntent,
  });

  return NextResponse.json({ ok: true, cycleId, intentId }, { status: 200 });
}

