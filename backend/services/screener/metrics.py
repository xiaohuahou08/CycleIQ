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


def mid_and_spread(bid: float, ask: float) -> tuple[float, float] | None:
    if bid <= 0 or ask <= 0 or ask < bid:
        return None
    raw_mid = (bid + ask) / 2.0
    if raw_mid <= 0:
        return None
    spread_ratio = (ask - bid) / raw_mid
    return raw_mid, spread_ratio


def fee_per_share(fee_per_contract: float, multiplier: int = 100) -> float:
    mult = multiplier if multiplier and multiplier > 0 else 100
    return float(fee_per_contract) / float(mult)


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
) -> dict[str, Any] | None:
    """Return per-share metrics or None if quote is unusable."""
    mode_norm = "call" if str(mode).lower() == "call" else "put"
    quote = mid_and_spread(bid, ask)
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
        "multiplier": multiplier,
    }
