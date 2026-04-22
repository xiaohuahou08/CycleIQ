import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { retryDemoExecutions } from "@/lib/demo/store";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { executionIds?: unknown; seedLabel?: unknown }
    | null;

  const executionIds = Array.isArray(json?.executionIds)
    ? json!.executionIds.filter((x): x is string => typeof x === "string")
    : [];
  const seedLabel = typeof json?.seedLabel === "string" ? json.seedLabel : "retry";

  const { created } = retryDemoExecutions(executionIds, seedLabel);
  return NextResponse.json({ ok: true, created }, { status: 200 });
}

