import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/quote?symbols=UNH,HIMS
 *
 * Server-side proxy to Yahoo Finance chart endpoint (no crumb/auth needed).
 * Requests are made in parallel, one per ticker.
 * Returns { [SYMBOL]: price } — missing/failed tickers are omitted.
 */

async function fetchOnePrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          Accept: "application/json, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        // Cache 60 s at the Next.js fetch layer
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols") ?? "";
  const tickers = symbols
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (tickers.length === 0) return NextResponse.json({});

  const pairs = await Promise.all(
    tickers.map(async (ticker) => [ticker, await fetchOnePrice(ticker)] as const)
  );

  const prices: Record<string, number> = {};
  for (const [ticker, price] of pairs) {
    if (price != null) prices[ticker] = price;
  }

  return NextResponse.json(prices);
}
