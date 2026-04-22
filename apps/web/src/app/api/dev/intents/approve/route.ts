import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { approveDemoIntents } from "@/lib/demo/store";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { intentIds?: unknown }
    | null;

  const intentIds = Array.isArray(json?.intentIds)
    ? json!.intentIds.filter((x): x is string => typeof x === "string")
    : [];

  const { updated } = approveDemoIntents(intentIds);
  return NextResponse.json({ ok: true, updated }, { status: 200 });
}

