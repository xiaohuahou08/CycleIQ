"""Hard filters for screener candidates (config-driven)."""

from __future__ import annotations

from datetime import date
from typing import Any


def in_strike_window(*, mode: str, strike: float, spot: float, cfg: dict[str, Any], avg_cost: float | None = None) -> bool:
    mode_norm = "call" if str(mode).lower() == "call" else "put"
    if spot <= 0 or strike <= 0:
        return False
    if mode_norm == "put":
        recall_upper = spot
        recall_lower = recall_upper * (1.0 - float(cfg["put_recall_below_pct"]))
        return recall_lower <= strike <= recall_upper
    sale_floor = float(cfg["call_cost_floor_mult"]) * float(avg_cost) if avg_cost and avg_cost > 0 else spot
    recall_min = max(sale_floor, spot)
    recall_max = recall_min * (1.0 + float(cfg["call_recall_above_pct"]))
    if recall_max < recall_min:
        return False
    return recall_min <= strike <= recall_max


def earnings_blocks_expiry(
    *,
    scan_day: date,
    expiry: date,
    earnings_day: date | None,
    hard_window_days: int,
) -> bool:
    """True when earnings falls in [expiry - hard_window_days, expiry] inclusive."""
    if earnings_day is None:
        return False
    if earnings_day < scan_day:
        return False
    delta = (expiry - earnings_day).days
    return 0 <= delta <= int(hard_window_days)


# Large-cap / profitable floor used when require_quality_fundamentals is on.
_MIN_MARKET_CAP_USD = 5_000_000_000.0
_MAX_DEBT_TO_EQUITY = 2.5


def _debt_to_equity_ratio(raw: Any) -> float | None:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value != value:
        return None
    # Yahoo sometimes sends 187 (percent) and sometimes 1.87 (ratio).
    return value / 100.0 if value > 10 else value


def evaluate_ticker_quality(
    fundamentals: dict[str, Any] | None,
    *,
    enabled: bool,
    require_data: bool = False,
) -> dict[str, Any]:
    """Hard-gate a ticker when the user wants quality underlyings.

    When ``require_data`` is true (universe prefilter), missing Yahoo numbers
    fail closed so option chains are only fetched for names that actually passed.
    """
    if not enabled:
        return {"accepted": True, "rule": "accepted"}
    if not fundamentals:
        if require_data:
            return {"accepted": False, "rule": "fundamentals_unavailable"}
        return {"accepted": True, "rule": "accepted"}

    has_signal = any(
        fundamentals.get(key) is not None
        for key in ("market_cap", "trailing_eps", "profit_margin", "debt_to_equity")
    )
    if require_data and not has_signal:
        return {"accepted": False, "rule": "fundamentals_unavailable"}

    market_cap = fundamentals.get("market_cap")
    if market_cap is not None and float(market_cap) < _MIN_MARKET_CAP_USD:
        return {
            "accepted": False,
            "rule": "market_cap_too_small",
            "metric_value": market_cap,
            "threshold": _MIN_MARKET_CAP_USD,
        }

    eps = fundamentals.get("trailing_eps")
    margin = fundamentals.get("profit_margin")
    if (eps is not None and float(eps) <= 0) or (margin is not None and float(margin) < 0):
        return {
            "accepted": False,
            "rule": "not_profitable",
            "metric_value": eps if eps is not None else margin,
        }

    leverage = _debt_to_equity_ratio(fundamentals.get("debt_to_equity"))
    if leverage is not None and leverage > _MAX_DEBT_TO_EQUITY:
        return {
            "accepted": False,
            "rule": "leverage_too_high",
            "metric_value": leverage,
            "threshold": _MAX_DEBT_TO_EQUITY,
        }

    return {"accepted": True, "rule": "accepted"}


def evaluate_hard_filters(
    row: dict[str, Any],
    *,
    cfg: dict[str, Any],
    scan_day: date,
    earnings_day: date | None,
) -> dict[str, Any]:
    """Return ``{accepted, rule, ...}`` for a metric-enriched candidate row.

    IV/RV and earnings are ranking/display signals only —
    they are not hard gates (those filters emptied scans on typical mega-caps).
    """
    dte = int(row.get("dte") or 0)
    if dte < int(cfg["min_dte"]) or dte > int(cfg["max_dte"]):
        return {"accepted": False, "rule": "dte_out_of_window", "metric_value": dte}

    spread = row.get("spread_ratio")
    if spread is None or float(spread) > float(cfg["max_spread_ratio"]):
        return {
            "accepted": False,
            "rule": "spread_too_wide",
            "metric_value": spread,
            "threshold": cfg["max_spread_ratio"],
        }

    net = row.get("net_premium_per_share")
    if net is None or float(net) < float(cfg["min_net_premium_usd"]):
        return {
            "accepted": False,
            "rule": "net_premium_too_low",
            "metric_value": net,
            "threshold": cfg["min_net_premium_usd"],
        }

    min_ann = float(cfg.get("min_annualized_return") or 0.0)
    if min_ann > 0:
        ann = row.get("annualized_net_return")
        if ann is None or float(ann) < min_ann:
            return {
                "accepted": False,
                "rule": "annualized_too_low",
                "metric_value": ann,
                "threshold": min_ann,
            }

    oi = row.get("open_interest")
    min_oi = int(cfg.get("min_open_interest") or 0)
    if min_oi > 0 and (oi is None or int(oi) < min_oi):
        return {
            "accepted": False,
            "rule": "open_interest_too_low",
            "metric_value": oi,
            "threshold": min_oi,
        }

    volume = row.get("volume")
    min_vol = int(cfg.get("min_volume") or 0)
    if min_vol > 0 and (volume is None or int(volume) < min_vol):
        return {
            "accepted": False,
            "rule": "volume_too_low",
            "metric_value": volume,
            "threshold": min_vol,
        }

    min_delta = float(cfg.get("min_abs_delta") or 0.0)
    max_delta = float(cfg.get("max_abs_delta") or 1.0)
    if min_delta > 0 or max_delta < 1:
        delta = row.get("delta")
        if delta is None:
            return {"accepted": False, "rule": "delta_unavailable", "metric_value": None}
        abs_delta = abs(float(delta))
        if abs_delta < min_delta or abs_delta > max_delta:
            return {
                "accepted": False,
                "rule": "delta_out_of_band",
                "metric_value": abs_delta,
                "threshold": (min_delta, max_delta),
            }

    return {"accepted": True, "rule": "accepted"}
