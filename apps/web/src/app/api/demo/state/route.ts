import { NextResponse } from "next/server";
import { getDemoState } from "@/lib/demo/store";

export async function GET() {
  return NextResponse.json(getDemoState(), { status: 200 });
}

