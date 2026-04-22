import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { cancelDemoExecutions } from "@/lib/demo/store";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { executionIds?: unknown }
    | null;

  const executionIds = Array.isArray(json?.executionIds)
    ? json!.executionIds.filter((x): x is string => typeof x === "string")
    : [];

  const { updated } = cancelDemoExecutions(executionIds);
  return NextResponse.json({ ok: true, updated }, { status: 200 });
}

