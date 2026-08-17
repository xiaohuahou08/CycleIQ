"""Live equity quotes via yfinance (Yahoo Finance)."""

from __future__ import annotations

import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf

logger = logging.getLogger(__name__)

_CACHE_TTL_SEC = 60.0
_cache: dict[str, tuple[float, float]] = {}  # ticker -> (price, fetched_at)


def _as_price(value: object) -> float | None:
    try:
        price = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(price):
        return None
    return price


def _fetch_one(ticker: str) -> float | None:
    try:
        stock = yf.Ticker(ticker)
        price = _as_price(getattr(stock.fast_info, "last_price", None))
        if price is not None:
            return price
        hist = stock.history(period="1d")
        if not hist.empty:
            return _as_price(hist["Close"].iloc[-1])
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
