import { NextRequest, NextResponse } from "next/server";
import { backendOrigin } from "@/lib/api/backend-url";

export const dynamic = "force-dynamic";

async function proxyToBackend(req: NextRequest, method: string): Promise<NextResponse> {
  const base = backendOrigin();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "Backend API URL is not configured. Set API_URL or NEXT_PUBLIC_API_URL on Vercel.",
      },
      { status: 503 }
    );
  }

  const headers: HeadersInit = {};
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;

  const init: RequestInit = { method, headers };
  if (method === "PUT" || method === "POST" || method === "PATCH") {
    headers["Content-Type"] = "application/json";
    init.body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/me/preferences`, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "GET");
}

export async function PUT(req: NextRequest) {
  return proxyToBackend(req, "PUT");
}
