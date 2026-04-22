import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { executeDemoIntents } from "@/lib/demo/store";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { intentIds?: unknown; seedLabel?: unknown }
    | null;

  const intentIds = Array.isArray(json?.intentIds)
    ? json!.intentIds.filter((x): x is string => typeof x === "string")
    : [];
  const seedLabel = typeof json?.seedLabel === "string" ? json.seedLabel : "dryrun";

  const { created } = executeDemoIntents(intentIds, seedLabel);
  return NextResponse.json({ ok: true, created }, { status: 200 });
}

