import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/quote?symbols=UNH,HIMS
 * Server-side proxy to Yahoo Finance v8 quote endpoint.
 * Returns { [SYMBOL]: price } — missing symbols are omitted.
 */
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols") ?? "";
  if (!symbols.trim()) return NextResponse.json({});

  const url = new URL("https://query1.finance.yahoo.com/v8/finance/quote");
  url.searchParams.set("symbols", symbols);
  url.searchParams.set("fields", "regularMarketPrice,symbol");

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      // Cache 60 s at edge so every user tab doesn't hammer Yahoo
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json({}, { status: upstream.status });
    }

    const json = (await upstream.json()) as {
      quoteResponse?: {
        result?: Array<{ symbol: string; regularMarketPrice?: number }>;
      };
    };

    const prices: Record<string, number> = {};
    for (const q of json.quoteResponse?.result ?? []) {
      if (q.symbol && q.regularMarketPrice != null) {
        prices[q.symbol] = q.regularMarketPrice;
      }
    }
    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({});
  }
}
