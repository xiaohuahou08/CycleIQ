import { NextResponse } from "next/server";
import { envServer } from "@/lib/env";
import { getWheel3Market } from "@/lib/demo/store";

export async function GET() {
  if (!envServer.ENABLE_DEV_ROUTES) {
    return NextResponse.json({ error: "Dev routes disabled" }, { status: 404 });
  }
  return NextResponse.json(getWheel3Market(), { status: 200 });
}

