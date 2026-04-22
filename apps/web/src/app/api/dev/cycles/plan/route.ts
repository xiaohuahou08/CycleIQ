import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { planDemoCycles } from "@/lib/demo/store";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { cycleIds?: unknown; seedLabel?: unknown }
    | null;

  const cycleIds = Array.isArray(json?.cycleIds)
    ? json!.cycleIds.filter((x): x is string => typeof x === "string")
    : [];
  const seedLabel = typeof json?.seedLabel === "string" ? json.seedLabel : "plan";

  const { created } = planDemoCycles(cycleIds, seedLabel);
  return NextResponse.json({ ok: true, created }, { status: 200 });
}

