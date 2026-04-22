import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { resetDemoState } from "@/lib/demo/store";

export async function POST() {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  resetDemoState();
  return NextResponse.json({ ok: true }, { status: 200 });
}

