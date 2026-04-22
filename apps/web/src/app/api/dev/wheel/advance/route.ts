import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { advanceWheel3Demo } from "@/lib/demo/store";
import type { WheelAdvanceAction } from "@/lib/terminal/wheel-engine";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { cycleId?: unknown; action?: unknown; days?: unknown }
    | null;

  const cycleId = typeof json?.cycleId === "string" ? json.cycleId : "";
  const actionRaw = typeof json?.action === "string" ? json.action : "";
  const days = typeof json?.days === "number" ? json.days : undefined;

  const allowed: WheelAdvanceAction[] = ["expire_otm", "assigned", "call_away"];
  if (!cycleId || !allowed.includes(actionRaw as WheelAdvanceAction)) {
    return NextResponse.json({ error: "Invalid cycleId or action" }, { status: 400 });
  }

  try {
    const res = advanceWheel3Demo({
      cycleId,
      action: actionRaw as WheelAdvanceAction,
      days,
    });
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 400 }
    );
  }
}

