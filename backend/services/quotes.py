"""Live equity quotes (Yahoo Finance chart endpoint)."""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx

logger = logging.getLogger(__name__)

_YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "Chrome/124 Safari/537.36"
    ),
    "Accept": "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
}
_CACHE_TTL_SEC = 60.0
_cache: dict[str, tuple[float, float]] = {}  # ticker -> (price, fetched_at)


def _fetch_one(ticker: str, timeout: float = 4.0) -> float | None:
    url = _YAHOO_CHART.format(ticker=ticker)
    try:
        with httpx.Client(timeout=timeout, headers=_HEADERS) as client:
            res = client.get(url, params={"interval": "1m", "range": "1d"})
            if res.status_code != 200:
                return None
            data = res.json()
            price = (
                data.get("chart", {})
                .get("result", [{}])[0]
                .get("meta", {})
                .get("regularMarketPrice")
            )
            if isinstance(price, (int, float)):
                return float(price)
    except Exception:
        logger.debug("quote fetch failed for %s", ticker, exc_info=True)
    return None


def fetch_yahoo_prices(tickers: list[str]) -> dict[str, float]:
    """Return ``{TICKER: price}`` for symbols that resolve; omit failures.

    Results are cached briefly to avoid hammering Yahoo on dashboard refresh.
    """
    now = time.monotonic()
    unique = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    if not unique:
        return {}

    prices: dict[str, float] = {}
    to_fetch: list[str] = []
    for ticker in unique:
        cached = _cache.get(ticker)
        if cached is not None and now - cached[1] < _CACHE_TTL_SEC:
            prices[ticker] = cached[0]
        else:
            to_fetch.append(ticker)

    if not to_fetch:
        return prices

    with ThreadPoolExecutor(max_workers=min(8, len(to_fetch))) as pool:
        futures = {pool.submit(_fetch_one, t): t for t in to_fetch}
        for fut in as_completed(futures):
            ticker = futures[fut]
            try:
                price = fut.result()
            except Exception:
                price = None
            if price is not None:
                prices[ticker] = price
                _cache[ticker] = (price, now)

    return prices


def clear_quote_cache() -> None:
    """Test helper."""
    _cache.clear()
