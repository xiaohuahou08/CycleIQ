import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { seedDemoState } from "@/lib/demo/store";

export async function POST() {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  seedDemoState(envServer.DEMO_SEED ?? "dev");
  return NextResponse.json({ ok: true }, { status: 200 });
}

