import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { applyDemoCycleEvent } from "@/lib/demo/store";
import type { WheelEventType } from "@/lib/terminal/actions";

export async function POST(req: Request) {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as
    | { cycleId?: unknown; eventType?: unknown }
    | null;

  const cycleId = typeof json?.cycleId === "string" ? json.cycleId : "";
  const eventType = typeof json?.eventType === "string" ? json.eventType : "";

  if (!cycleId || !eventType) {
    return NextResponse.json({ error: "Missing cycleId or eventType" }, { status: 400 });
  }

  try {
    const allowed: WheelEventType[] = [
      "CSP_EXPIRE_OTM",
      "CSP_ASSIGNED",
      "CC_EXPIRE_OTM",
      "CC_ASSIGNED",
      "EXECUTION_FILLED",
    ];
    if (!allowed.includes(eventType as WheelEventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const res = applyDemoCycleEvent({ cycleId, eventType: eventType as WheelEventType });
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 400 }
    );
  }
}

