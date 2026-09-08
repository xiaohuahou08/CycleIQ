"""Per-share option candidate metrics (USD)."""

from __future__ import annotations

import math
from typing import Any


def _finite(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def mid_and_spread(
    bid: float, ask: float, last: float | None = None
) -> tuple[float, float] | None:
    if bid > 0 and ask > 0 and ask >= bid:
        raw_mid = (bid + ask) / 2.0
        if raw_mid <= 0:
            return None
        spread_ratio = (ask - bid) / raw_mid
        return raw_mid, spread_ratio
    # After hours / one-sided book: Yahoo often zeros bid/ask while lastPrice remains.
    last_f = last if last is not None and last > 0 else None
    if last_f:
        return last_f, 0.0
    return None


def fee_per_share(fee_per_contract: float, multiplier: int = 100) -> float:
    mult = multiplier if multiplier and multiplier > 0 else 100
    return float(fee_per_contract) / float(mult)


def option_delta(
    *,
    spot: float,
    strike: float,
    dte: int,
    iv: float | None,
    mode: str,
    rate: float = 0.045,
) -> float | None:
    """Black-Scholes delta from Yahoo IV (call in (0,1], put in [-1,0))."""
    iv_f = _finite(iv)
    if iv_f is None or iv_f <= 0.01:
        return None
    if spot <= 0 or strike <= 0 or dte < 1:
        return None
    time_years = float(dte) / 365.0
    sqrt_t = math.sqrt(time_years)
    if sqrt_t <= 0:
        return None
    d1 = (math.log(spot / strike) + (rate + 0.5 * iv_f * iv_f) * time_years) / (iv_f * sqrt_t)
    nd1 = 0.5 * (1.0 + math.erf(d1 / math.sqrt(2.0)))
    if str(mode).lower() == "call":
        return nd1
    return nd1 - 1.0


def build_candidate_metrics(
    *,
    mode: str,
    bid: float,
    ask: float,
    strike: float,
    spot: float,
    dte: int,
    iv: float | None,
    term_matched_rv: float | None,
    open_interest: int | None,
    fee_per_contract: float,
    multiplier: int = 100,
    last: float | None = None,
    volume: int | None = None,
) -> dict[str, Any] | None:
    """Return per-share metrics or None if quote is unusable."""
    mode_norm = "call" if str(mode).lower() == "call" else "put"
    quote = mid_and_spread(bid, ask, last)
    if quote is None:
        return None
    sell_limit, spread_ratio = quote
    fee_share = fee_per_share(fee_per_contract, multiplier)
    net = sell_limit - fee_share
    if dte < 1:
        return None

    if mode_norm == "put":
        cash_basis = strike - net
        if cash_basis <= 0:
            return None
        period = net / cash_basis
        breakeven = strike - net
        assignment_discount = (spot - breakeven) / spot if spot > 0 else None
    else:
        if spot <= 0:
            return None
        period = net / spot
        breakeven = strike + net
        assignment_discount = (strike - spot) / spot if spot > 0 else None

    annualized = period * 365.0 / float(dte)

    iv_f = _finite(iv)
    rv_f = _finite(term_matched_rv)
    iv_rv_ratio = None
    iv_minus_rv = None
    if iv_f is not None and rv_f is not None and rv_f > 0:
        iv_rv_ratio = iv_f / rv_f
        iv_minus_rv = iv_f - rv_f

    return {
        "mode": mode_norm,
        "bid": bid,
        "ask": ask,
        "mid": sell_limit,
        "sell_limit": sell_limit,
        "spread_ratio": spread_ratio,
        "gross_premium_per_share": sell_limit,
        "fee_per_share": fee_share,
        "net_premium_per_share": net,
        "period_net_return": period,
        "annualized_net_return": annualized,
        "breakeven": breakeven,
        "net_assignment_discount_pct": assignment_discount,
        "implied_volatility": iv_f,
        "term_matched_rv": rv_f,
        "iv_rv_ratio": iv_rv_ratio,
        "iv_minus_rv": iv_minus_rv,
        "open_interest": open_interest,
        "volume": volume,
        "delta": option_delta(spot=spot, strike=strike, dte=dte, iv=iv_f, mode=mode_norm),
        "multiplier": multiplier,
    }
