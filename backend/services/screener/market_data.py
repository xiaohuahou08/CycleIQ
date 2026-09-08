"""yfinance market data helpers for the options screener."""

from __future__ import annotations

import logging
import math
import time
from datetime import date, datetime, timezone
from typing import Any

import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)

_CACHE_TTL_SEC = 120.0
_OPTIONS_ATTEMPTS = 3
_OPTIONS_RETRY_SEC = 0.4
_spot_cache: dict[str, tuple[float, float]] = {}
_chain_cache: dict[str, tuple[dict[str, Any], float]] = {}
_earnings_cache: dict[str, tuple[date | None, float]] = {}
_rv_cache: dict[str, tuple[float | None, float]] = {}
_fund_cache: dict[str, tuple[dict[str, Any] | None, float]] = {}
_FUND_TTL_SEC = 3600.0


def _as_float(value: object) -> float | None:
    try:
        parsed = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def _fast_attr(fast: Any, *names: str) -> Any:
    if fast is None:
        return None
    if isinstance(fast, dict):
        for name in names:
            if name in fast and fast[name] is not None:
                return fast[name]
        return None
    for name in names:
        value = getattr(fast, name, None)
        if value is not None:
            return value
    return None


def _list_option_expiries(stock: Any, *, symbol: str) -> list[str]:
    """Yahoo crumb/rate-limit often returns [] or throws; retry a few times."""
    expiries: list[str] = []
    for attempt in range(_OPTIONS_ATTEMPTS):
        try:
            expiries = [str(item) for item in (getattr(stock, "options", None) or [])]
        except Exception:
            logger.warning(
                "options calendar attempt %s/%s failed for %s",
                attempt + 1,
                _OPTIONS_ATTEMPTS,
                symbol,
                exc_info=attempt == _OPTIONS_ATTEMPTS - 1,
            )
            expiries = []
        if expiries:
            return expiries
        if attempt + 1 < _OPTIONS_ATTEMPTS and _OPTIONS_RETRY_SEC > 0:
            time.sleep(_OPTIONS_RETRY_SEC * (attempt + 1))
    return expiries


def clear_screener_market_cache() -> None:
    _spot_cache.clear()
    _chain_cache.clear()
    _earnings_cache.clear()
    _rv_cache.clear()
    _fund_cache.clear()


def fetch_spot(ticker: str) -> float | None:
    key = ticker.strip().upper()
    now = time.monotonic()
    cached = _spot_cache.get(key)
    if cached and now - cached[1] < _CACHE_TTL_SEC:
        return cached[0]
    try:
        stock = yf.Ticker(key)
        price = _as_float(_fast_attr(getattr(stock, "fast_info", None), "last_price", "lastPrice"))
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


def fetch_fundamentals(ticker: str, *, stock: Any | None = None) -> dict[str, Any] | None:
    """Snapshot of quality metrics from Yahoo (cached ~1h). Missing fields are omitted."""
    key = ticker.strip().upper()
    now = time.monotonic()
    cached = _fund_cache.get(key)
    if cached and now - cached[1] < _FUND_TTL_SEC:
        return cached[0]

    info: dict[str, Any] | None = None
    try:
        ticker_obj = stock if stock is not None else yf.Ticker(key)
        fast = getattr(ticker_obj, "fast_info", None)
        raw_info = getattr(ticker_obj, "info", None)
        if not isinstance(raw_info, dict):
            raw_info = {}
        market_cap = _as_float(_fast_attr(fast, "market_cap", "marketCap"))
        if market_cap is None:
            market_cap = _as_float(raw_info.get("marketCap"))
        trailing_eps = _as_float(raw_info.get("trailingEps"))
        profit_margin = _as_float(raw_info.get("profitMargins"))
        debt_to_equity = _as_float(raw_info.get("debtToEquity"))
        snapshot = {
            "market_cap": market_cap,
            "trailing_eps": trailing_eps,
            "profit_margin": profit_margin,
            "debt_to_equity": debt_to_equity,
        }
        if any(v is not None for v in snapshot.values()):
            info = snapshot
    except Exception:
        logger.debug("fundamentals fetch failed for %s", key, exc_info=True)
        info = None
    _fund_cache[key] = (info, now)
    return info


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
        bid = _as_float(r.get("bid")) or 0.0
        ask = _as_float(r.get("ask")) or 0.0
        last = _as_float(r.get("lastPrice"))
        strike = _as_float(r.get("strike"))
        if strike is None:
            continue
        if bid <= 0 and ask <= 0 and (last is None or last <= 0):
            continue
        iv = _as_float(r.get("impliedVolatility"))
        oi_raw = r.get("openInterest")
        oi = None
        try:
            if oi_raw is not None and str(oi_raw) != "nan":
                oi = int(oi_raw)
        except (TypeError, ValueError):
            oi = None
        vol_raw = r.get("volume")
        volume = None
        try:
            if vol_raw is not None and str(vol_raw) != "nan":
                volume = int(vol_raw)
        except (TypeError, ValueError):
            volume = None
        rows.append(
            {
                "option_type": option_type,
                "strike": strike,
                "bid": bid,
                "ask": ask,
                "last": last,
                "implied_volatility": iv,
                "open_interest": oi,
                "volume": volume,
            }
        )
    return rows


def fetch_option_chain(
    ticker: str,
    *,
    min_dte: int,
    max_dte: int,
    include_earnings: bool = False,
    include_fundamentals: bool = True,
    include_rv: bool = False,
) -> dict[str, Any]:
    """Return ``{spot, expirations: [{expiry, dte, puts, calls}], earnings}``."""
    key = ticker.strip().upper()
    cache_key = f"{key}:{min_dte}:{max_dte}:{int(include_earnings)}:{int(include_fundamentals)}:{int(include_rv)}"
    now = time.monotonic()
    cached = _chain_cache.get(cache_key)
    if cached and now - cached[1] < _CACHE_TTL_SEC and not cached[0].get("error"):
        return cached[0]

    result: dict[str, Any] = {
        "symbol": key,
        "spot": None,
        "earnings_day": None,
        "fundamentals": None,
        "expirations": [],
        "error": None,
    }

    try:
        stock = yf.Ticker(key)
        spot = _as_float(_fast_attr(getattr(stock, "fast_info", None), "last_price", "lastPrice"))
        if spot is None:
            hist = stock.history(period="5d")
            if hist is not None and not getattr(hist, "empty", True):
                spot = _as_float(hist["Close"].iloc[-1])
        if spot is not None:
            _spot_cache[key] = (spot, time.monotonic())
        result["spot"] = spot
        if spot is None:
            result["error"] = "spot_unavailable"
            return result

        expiries = _list_option_expiries(stock, symbol=key)
        if not expiries:
            result["error"] = "options_calendar_unavailable"
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
                    "term_matched_rv": term_matched_rv(key, dte=dte) if include_rv else None,
                }
            )

        result["expirations"] = expirations
        if not expirations:
            result["error"] = "no_expiries_in_dte_window"
            return result

        if include_earnings:
            result["earnings_day"] = fetch_earnings_day(key)
        if include_fundamentals:
            result["fundamentals"] = fetch_fundamentals(key, stock=stock)
        _chain_cache[cache_key] = (result, now)
        return result
    except Exception:
        logger.warning("option chain fetch failed for %s", key, exc_info=True)
        result["error"] = result.get("error") or "fetch_failed"
        return result


def fetch_chains_parallel(
    tickers: list[str],
    *,
    min_dte: int,
    max_dte: int,
    include_earnings: bool = False,
    include_fundamentals: bool = True,
    include_rv: bool = False,
) -> dict[str, dict[str, Any]]:
    unique = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    out: dict[str, dict[str, Any]] = {}
    # yfinance cookie/crumb is not safe under concurrent option-chain fetches;
    # parallel workers were returning empty calendars for most of the watchlist.
    for ticker in unique:
        try:
            out[ticker] = fetch_option_chain(
                ticker,
                min_dte=min_dte,
                max_dte=max_dte,
                include_earnings=include_earnings,
                include_fundamentals=include_fundamentals,
                include_rv=include_rv,
            )
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
