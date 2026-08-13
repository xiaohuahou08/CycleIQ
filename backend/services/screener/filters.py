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


def evaluate_hard_filters(
    row: dict[str, Any],
    *,
    cfg: dict[str, Any],
    scan_day: date,
    earnings_day: date | None,
) -> dict[str, Any]:
    """Return ``{accepted, rule, ...}`` for a metric-enriched candidate row."""
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

    ann = row.get("annualized_net_return")
    if ann is None or float(ann) < float(cfg["min_annualized_return"]):
        return {
            "accepted": False,
            "rule": "annualized_too_low",
            "metric_value": ann,
            "threshold": cfg["min_annualized_return"],
        }

    iv_rv = row.get("iv_rv_ratio")
    iv_minus = row.get("iv_minus_rv")
    if iv_rv is None or iv_minus is None:
        return {"accepted": False, "rule": "iv_rv_unavailable", "metric_value": None}
    if float(iv_rv) < float(cfg["min_iv_rv_ratio"]):
        return {
            "accepted": False,
            "rule": "iv_rv_ratio_too_low",
            "metric_value": iv_rv,
            "threshold": cfg["min_iv_rv_ratio"],
        }
    if float(iv_minus) < float(cfg["min_iv_minus_rv"]):
        return {
            "accepted": False,
            "rule": "iv_minus_rv_too_low",
            "metric_value": iv_minus,
            "threshold": cfg["min_iv_minus_rv"],
        }

    expiry = row.get("expiry")
    if isinstance(expiry, date) and earnings_blocks_expiry(
        scan_day=scan_day,
        expiry=expiry,
        earnings_day=earnings_day,
        hard_window_days=int(cfg["earnings_hard_window_days"]),
    ):
        return {
            "accepted": False,
            "rule": "earnings_in_hard_window",
            "metric_value": earnings_day.isoformat() if earnings_day else None,
        }

    return {"accepted": True, "rule": "accepted"}
