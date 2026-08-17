"""Screener defaults, merge, and validation (per-share USD thresholds)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"]

DEFAULT_SCREENER_CONFIG: dict[str, Any] = {
    "watchlist": list(DEFAULT_WATCHLIST),
    "min_dte": 21,
    "max_dte": 45,
    "min_net_premium_usd": 0.10,
    "min_annualized_return": 0.0,
    "min_iv_rv_ratio": 0.0,
    "min_iv_minus_rv": 0.0,
    "max_spread_ratio": 0.50,
    "put_recall_below_pct": 0.25,
    "call_recall_above_pct": 0.25,
    "call_cost_floor_mult": 1.02,
    "earnings_hard_window_days": 0,
    "return_proximity_band": 0.002,
    "fee_per_contract_usd": None,
}

_MAX_WATCHLIST = 30
# First-release factory gates were too strict (IV/RV) or too loose (40% spread).
_LEGACY_IV_RV_FACTORY = (1.10, 0.05)
_LEGACY_FILTER_FACTORY = {
    "min_dte": 21,
    "max_dte": 45,
    "min_net_premium_usd": 0.50,
    "min_annualized_return": 0.10,
    "max_spread_ratio": 0.40,
    "put_recall_below_pct": 0.20,
    "call_recall_above_pct": 0.20,
    "call_cost_floor_mult": 1.02,
    "earnings_hard_window_days": 6,
    "return_proximity_band": 0.002,
}


def _close(left: Any, right: float) -> bool:
    try:
        return abs(float(left) - right) < 1e-9
    except (TypeError, ValueError):
        return False


def default_screener_config() -> dict[str, Any]:
    return deepcopy(DEFAULT_SCREENER_CONFIG)


def merge_screener_config(raw: Any) -> dict[str, Any]:
    """Merge stored/partial config onto defaults (does not validate)."""
    out = default_screener_config()
    if not isinstance(raw, dict):
        return out
    for key in DEFAULT_SCREENER_CONFIG:
        if key in raw:
            out[key] = raw[key]
    if _close(out["min_iv_rv_ratio"], _LEGACY_IV_RV_FACTORY[0]) and _close(
        out["min_iv_minus_rv"], _LEGACY_IV_RV_FACTORY[1]
    ):
        out["min_iv_rv_ratio"] = 0.0
        out["min_iv_minus_rv"] = 0.0
    if all(_close(out[key], value) for key, value in _LEGACY_FILTER_FACTORY.items()) and _close(
        out["min_iv_rv_ratio"], 0.0
    ) and _close(out["min_iv_minus_rv"], 0.0):
        for key, value in DEFAULT_SCREENER_CONFIG.items():
            if key in ("watchlist", "fee_per_contract_usd"):
                continue
            out[key] = deepcopy(value)
    return out


def _as_float(value: Any, field: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a number") from exc
    if parsed != parsed:  # NaN
        raise ValueError(f"{field} must be a number")
    return parsed


def _as_int(value: Any, field: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc
    return parsed


def parse_screener_config(raw: Any) -> dict[str, Any]:
    """Validate and normalize a screener config payload."""
    if raw is None:
        return default_screener_config()
    if not isinstance(raw, dict):
        raise ValueError("screener_config must be an object")

    cfg = merge_screener_config(raw)

    watchlist_raw = cfg.get("watchlist")
    if not isinstance(watchlist_raw, list):
        raise ValueError("watchlist must be a list of tickers")
    watchlist: list[str] = []
    seen: set[str] = set()
    for item in watchlist_raw:
        ticker = str(item or "").strip().upper()
        if not ticker:
            continue
        if len(ticker) > 10:
            raise ValueError(f"ticker too long: {ticker}")
        if ticker not in seen:
            seen.add(ticker)
            watchlist.append(ticker)
    if len(watchlist) > _MAX_WATCHLIST:
        raise ValueError(f"watchlist must have at most {_MAX_WATCHLIST} tickers")
    if not watchlist:
        watchlist = list(DEFAULT_WATCHLIST)
    cfg["watchlist"] = watchlist

    min_dte = _as_int(cfg["min_dte"], "min_dte")
    max_dte = _as_int(cfg["max_dte"], "max_dte")
    if min_dte < 1:
        raise ValueError("min_dte must be >= 1")
    if max_dte < min_dte:
        raise ValueError("max_dte must be >= min_dte")
    if max_dte > 365:
        raise ValueError("max_dte must be <= 365")
    cfg["min_dte"] = min_dte
    cfg["max_dte"] = max_dte

    min_net = _as_float(cfg["min_net_premium_usd"], "min_net_premium_usd")
    if min_net < 0:
        raise ValueError("min_net_premium_usd must be >= 0")
    cfg["min_net_premium_usd"] = min_net

    for field, lo, hi in (
        ("min_annualized_return", 0.0, 5.0),
        ("min_iv_rv_ratio", 0.0, 10.0),
        ("min_iv_minus_rv", -1.0, 5.0),
        ("max_spread_ratio", 0.0, 2.0),
        ("put_recall_below_pct", 0.01, 1.0),
        ("call_recall_above_pct", 0.01, 1.0),
        ("call_cost_floor_mult", 1.0, 2.0),
        ("return_proximity_band", 0.0, 0.1),
    ):
        value = _as_float(cfg[field], field)
        if value < lo or value > hi:
            raise ValueError(f"{field} must be between {lo} and {hi}")
        cfg[field] = value

    earnings_days = _as_int(cfg["earnings_hard_window_days"], "earnings_hard_window_days")
    if earnings_days < 0 or earnings_days > 30:
        raise ValueError("earnings_hard_window_days must be between 0 and 30")
    cfg["earnings_hard_window_days"] = earnings_days

    fee = cfg.get("fee_per_contract_usd")
    if fee is None or (isinstance(fee, str) and fee.strip() == ""):
        cfg["fee_per_contract_usd"] = None
    else:
        fee_f = _as_float(fee, "fee_per_contract_usd")
        if fee_f < 0:
            raise ValueError("fee_per_contract_usd must be >= 0")
        cfg["fee_per_contract_usd"] = fee_f

    return cfg


def resolve_fee_per_contract(
    cfg: dict[str, Any],
    *,
    commission_per_contract: float | None,
) -> float:
    fee = cfg.get("fee_per_contract_usd")
    if fee is not None:
        return float(fee)
    if commission_per_contract is not None:
        return float(commission_per_contract)
    return 0.65
