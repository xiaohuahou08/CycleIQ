import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { createWheel3Demo } from "@/lib/demo/store";
import type { WheelStrategyParams } from "@/lib/terminal/wheel-engine";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | {
        ticker?: unknown;
        seed?: unknown;
        asOfDate?: unknown;
        strategy?: Partial<WheelStrategyParams>;
      }
    | null;

  const ticker = typeof json?.ticker === "string" ? json.ticker : "";
  if (!ticker.trim()) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  const seed = typeof json?.seed === "string" ? json.seed : undefined;
  const asOfDate = typeof json?.asOfDate === "string" ? json.asOfDate : undefined;
  const s = json?.strategy ?? {};

  const strategy: WheelStrategyParams = {
    contracts: Number(s.contracts ?? 1),
    targetDte: Number(s.targetDte ?? 30),
    targetDelta: Number(s.targetDelta ?? 0.25),
    rollDaysBefore: Number(s.rollDaysBefore ?? 7),
    takeProfitPct: Number(s.takeProfitPct ?? 0.5),
    stopLossPct: s.stopLossPct === undefined ? undefined : Number(s.stopLossPct),
  };

  const res = createWheel3Demo({ ticker, seed, asOfDate, strategy });
  return NextResponse.json({ ok: true, ...res }, { status: 200 });
}

