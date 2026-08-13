"""yfinance market data helpers for the options screener."""

from __future__ import annotations

import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from typing import Any

import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)

_CACHE_TTL_SEC = 120.0
_spot_cache: dict[str, tuple[float, float]] = {}
_chain_cache: dict[str, tuple[dict[str, Any], float]] = {}
_earnings_cache: dict[str, tuple[date | None, float]] = {}
_rv_cache: dict[str, tuple[float | None, float]] = {}


def _as_float(value: object) -> float | None:
    try:
        parsed = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def clear_screener_market_cache() -> None:
    _spot_cache.clear()
    _chain_cache.clear()
    _earnings_cache.clear()
    _rv_cache.clear()


def fetch_spot(ticker: str) -> float | None:
    key = ticker.strip().upper()
    now = time.monotonic()
    cached = _spot_cache.get(key)
    if cached and now - cached[1] < _CACHE_TTL_SEC:
        return cached[0]
    try:
        stock = yf.Ticker(key)
        price = _as_float(getattr(stock.fast_info, "last_price", None))
        if price is None:
            hist = stock.history(period="5d")
            if not hist.empty:
                price = _as_float(hist["Close"].iloc[-1])
        if price is not None:
            _spot_cache[key] = (price, now)
        return price
    except Exception:
        logger.debug("spot fetch failed for %s", key, exc_info=True)
        return None


def fetch_earnings_day(ticker: str) -> date | None:
    key = ticker.strip().upper()
    now = time.monotonic()
    cached = _earnings_cache.get(key)
    if cached and now - cached[1] < _CACHE_TTL_SEC:
        return cached[0]
    earnings: date | None = None
    try:
        stock = yf.Ticker(key)
        cal = getattr(stock, "calendar", None)
        raw = None
        if isinstance(cal, dict):
            raw = cal.get("Earnings Date") or cal.get("Earnings Date")
        elif cal is not None and hasattr(cal, "get"):
            try:
                raw = cal.get("Earnings Date")
            except Exception:
                raw = None
        if raw is not None:
            if isinstance(raw, (list, tuple)) and raw:
                raw = raw[0]
            if isinstance(raw, datetime):
                earnings = raw.date()
            elif isinstance(raw, date):
                earnings = raw
            elif hasattr(raw, "to_pydatetime"):
                earnings = raw.to_pydatetime().date()
            elif isinstance(raw, str) and raw.strip():
                earnings = date.fromisoformat(raw.strip()[:10])
    except Exception:
        logger.debug("earnings fetch failed for %s", key, exc_info=True)
    _earnings_cache[key] = (earnings, now)
    return earnings


def term_matched_rv(ticker: str, *, dte: int) -> float | None:
    """Annualized log-return std with lookback = max(20, remaining sessions ≈ DTE)."""
    key = f"{ticker.strip().upper()}:{int(dte)}"
    now = time.monotonic()
    cached = _rv_cache.get(key)
    if cached and now - cached[1] < _CACHE_TTL_SEC:
        return cached[0]

    lookback = max(20, int(dte))
    period_days = max(lookback + 10, 40)
    rv: float | None = None
    try:
        stock = yf.Ticker(ticker.strip().upper())
        hist = stock.history(period=f"{period_days}d")
        if hist is not None and not hist.empty and "Close" in hist.columns:
            closes = hist["Close"].dropna().astype(float)
            if len(closes) >= lookback + 1:
                window = closes.iloc[-(lookback + 1) :]
                log_rets = np.log(window / window.shift(1)).dropna()
                if len(log_rets) >= max(10, lookback // 2):
                    std = float(log_rets.std(ddof=1))
                    if math.isfinite(std):
                        rv = std * math.sqrt(252.0)
    except Exception:
        logger.debug("RV fetch failed for %s dte=%s", ticker, dte, exc_info=True)
    _rv_cache[key] = (rv, now)
    return rv


def _option_rows_from_chain(chain_df, *, option_type: str) -> list[dict[str, Any]]:
    if chain_df is None or getattr(chain_df, "empty", True):
        return []
    rows: list[dict[str, Any]] = []
    for _, r in chain_df.iterrows():
        bid = _as_float(r.get("bid"))
        ask = _as_float(r.get("ask"))
        strike = _as_float(r.get("strike"))
        if bid is None or ask is None or strike is None:
            continue
        iv = _as_float(r.get("impliedVolatility"))
        oi_raw = r.get("openInterest")
        oi = None
        try:
            if oi_raw is not None and str(oi_raw) != "nan":
                oi = int(oi_raw)
        except (TypeError, ValueError):
            oi = None
        rows.append(
            {
                "option_type": option_type,
                "strike": strike,
                "bid": bid,
                "ask": ask,
                "implied_volatility": iv,
                "open_interest": oi,
            }
        )
    return rows


def fetch_option_chain(ticker: str, *, min_dte: int, max_dte: int) -> dict[str, Any]:
    """Return ``{spot, expirations: [{expiry, dte, puts, calls}], earnings}``."""
    key = ticker.strip().upper()
    cache_key = f"{key}:{min_dte}:{max_dte}"
    now = time.monotonic()
    cached = _chain_cache.get(cache_key)
    if cached and now - cached[1] < _CACHE_TTL_SEC:
        return cached[0]

    spot = fetch_spot(key)
    earnings = fetch_earnings_day(key)
    result: dict[str, Any] = {
        "symbol": key,
        "spot": spot,
        "earnings_day": earnings,
        "expirations": [],
        "error": None,
    }
    if spot is None:
        result["error"] = "spot_unavailable"
        _chain_cache[cache_key] = (result, now)
        return result

    try:
        stock = yf.Ticker(key)
        expiries = list(getattr(stock, "options", None) or [])
    except Exception:
        logger.debug("options calendar failed for %s", key, exc_info=True)
        result["error"] = "options_calendar_unavailable"
        _chain_cache[cache_key] = (result, now)
        return result

    today = datetime.now(timezone.utc).date()
    expirations: list[dict[str, Any]] = []
    for exp_str in expiries:
        try:
            expiry = date.fromisoformat(str(exp_str)[:10])
        except ValueError:
            continue
        dte = (expiry - today).days
        if dte < min_dte or dte > max_dte:
            continue
        try:
            chain = stock.option_chain(exp_str)
        except Exception:
            logger.debug("option_chain failed %s %s", key, exp_str, exc_info=True)
            continue
        puts = _option_rows_from_chain(chain.puts, option_type="PUT")
        calls = _option_rows_from_chain(chain.calls, option_type="CALL")
        expirations.append(
            {
                "expiry": expiry,
                "expiry_str": expiry.isoformat(),
                "dte": dte,
                "puts": puts,
                "calls": calls,
                "term_matched_rv": term_matched_rv(key, dte=dte),
            }
        )

    result["expirations"] = expirations
    if not expirations:
        result["error"] = "no_expiries_in_dte_window"
    _chain_cache[cache_key] = (result, now)
    return result


def fetch_chains_parallel(
    tickers: list[str],
    *,
    min_dte: int,
    max_dte: int,
) -> dict[str, dict[str, Any]]:
    unique = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    out: dict[str, dict[str, Any]] = {}
    if not unique:
        return out
    with ThreadPoolExecutor(max_workers=min(6, len(unique))) as pool:
        futures = {
            pool.submit(fetch_option_chain, t, min_dte=min_dte, max_dte=max_dte): t for t in unique
        }
        for fut in as_completed(futures):
            ticker = futures[fut]
            try:
                out[ticker] = fut.result()
            except Exception:
                logger.debug("chain worker failed for %s", ticker, exc_info=True)
                out[ticker] = {
                    "symbol": ticker,
                    "spot": None,
                    "earnings_day": None,
                    "expirations": [],
                    "error": "fetch_failed",
                }
    return out
