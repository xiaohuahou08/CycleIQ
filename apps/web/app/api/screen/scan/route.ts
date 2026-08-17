import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/screen/scan
 *
 * Same-origin proxy to Flask. Next.js returns 405 for POST when a path has no
 * Route Handler; rewrites alone are not enough under NEXT_PUBLIC_API_PROXY=1.
 */
export const maxDuration = 60;
export const runtime = "nodejs";

function backendBase(): string | null {
  const url =
    process.env.API_BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  return url.replace(/\/$/, "") || null;
}

export async function POST(req: NextRequest) {
  const base = backendBase();
  if (!base) {
    return NextResponse.json(
      { error: "API backend is not configured (API_BACKEND_URL)." },
      { status: 500 },
    );
  }

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  headers.set("content-type", req.headers.get("content-type") || "application/json");

  try {
    const res = await fetch(`${base}/api/screen/scan`, {
      method: "POST",
      headers,
      body: await req.text(),
    });
    const text = await res.text();
    if (res.status === 405) {
      return NextResponse.json(
        {
          error:
            "API server rejected POST /api/screen/scan (405). Render is still running a build without the screener route — deploy the Flask service from the same git branch as this web app (dev), then retry.",
        },
        { status: 503 },
      );
    }
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "Cannot reach API backend for screen scan." }, { status: 502 });
  }
}
