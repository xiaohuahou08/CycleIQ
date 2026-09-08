"""OM-style ranking: period return groups, then tie-breakers; one pick per symbol."""

from __future__ import annotations

from typing import Any


def _period(row: dict[str, Any]) -> float:
    return float(row.get("period_net_return") or 0.0)


def _ann(row: dict[str, Any]) -> float:
    value = row.get("annualized_net_return")
    if value is not None:
        try:
            return float(value)
        except (TypeError, ValueError):
            pass
    return _period(row)


def _discount(row: dict[str, Any]) -> float:
    value = row.get("net_assignment_discount_pct")
    return float(value) if value is not None else -1.0


def _spread(row: dict[str, Any]) -> float:
    value = row.get("spread_ratio")
    return float(value) if value is not None else 999.0


def _oi_key(row: dict[str, Any]) -> tuple[int, int]:
    oi = row.get("open_interest")
    if oi is None:
        return (0, 0)
    return (1, int(oi))


def _abs_delta(row: dict[str, Any]) -> float:
    value = row.get("delta")
    if value is None:
        return 99.0
    return abs(float(value))


def _delta_from_target(row: dict[str, Any], *, target: float = 0.20) -> float:
    return abs(_abs_delta(row) - target)


def _net_premium(row: dict[str, Any]) -> float:
    return float(row.get("net_premium_per_share") or 0.0)


def _contract_id(row: dict[str, Any]) -> str:
    return str(row.get("contract_id") or f"{row.get('symbol')}-{row.get('expiry')}-{row.get('strike')}")


def within_symbol_sort_key(row: dict[str, Any], *, mode: str) -> tuple:
    mode_norm = "call" if str(mode).lower() == "call" else "put"
    if mode_norm == "put":
        return (
            -_ann(row),
            -_discount(row),
            _spread(row),
            _delta_from_target(row),
            -_oi_key(row)[0],
            -_oi_key(row)[1],
            -_net_premium(row),
            _contract_id(row),
        )
    return (
        -_ann(row),
        -float(row.get("strike") or 0.0),
        _spread(row),
        _delta_from_target(row),
        -_oi_key(row)[0],
        -_oi_key(row)[1],
        -_net_premium(row),
        _contract_id(row),
    )


def cross_symbol_sort_key(row: dict[str, Any], *, mode: str) -> tuple:
    mode_norm = "call" if str(mode).lower() == "call" else "put"
    if mode_norm == "put":
        return (
            -_ann(row),
            -_discount(row),
            _spread(row),
            _delta_from_target(row),
            -_oi_key(row)[0],
            -_oi_key(row)[1],
            -_net_premium(row),
            str(row.get("symbol") or ""),
            _contract_id(row),
        )
    strike_above = float(row.get("strike") or 0.0) - float(row.get("spot") or 0.0)
    return (
        -_ann(row),
        -strike_above,
        _spread(row),
        _delta_from_target(row),
        -_oi_key(row)[0],
        -_oi_key(row)[1],
        -_net_premium(row),
        str(row.get("symbol") or ""),
        _contract_id(row),
    )


def pick_best_per_symbol(rows: list[dict[str, Any]], *, mode: str) -> list[dict[str, Any]]:
    by_symbol: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        symbol = str(row.get("symbol") or "").upper()
        by_symbol.setdefault(symbol, []).append(row)

    picks: list[dict[str, Any]] = []
    for symbol, group in by_symbol.items():
        best = sorted(group, key=lambda r: within_symbol_sort_key(r, mode=mode))[0]
        picks.append(best)
    return picks


def rank_candidates(
    rows: list[dict[str, Any]],
    *,
    mode: str,
    proximity_band: float,
) -> list[dict[str, Any]]:
    """Group by annualized-return proximity, sort within/across symbols like OM."""
    if not rows:
        return []

    picks = pick_best_per_symbol(rows, mode=mode)
    picks_sorted = sorted(picks, key=lambda r: cross_symbol_sort_key(r, mode=mode))

    # Anchor grouping: walk in annualized-return order, bucket near-equal yields.
    by_yield = sorted(picks_sorted, key=_ann, reverse=True)
    buckets: list[list[dict[str, Any]]] = []
    for row in by_yield:
        if not buckets:
            buckets.append([row])
            continue
        anchor = _ann(buckets[-1][0])
        if abs(_ann(row) - anchor) <= float(proximity_band):
            buckets[-1].append(row)
        else:
            buckets.append([row])

    ranked: list[dict[str, Any]] = []
    for bucket in buckets:
        ranked.extend(sorted(bucket, key=lambda r: cross_symbol_sort_key(r, mode=mode)))

    for idx, row in enumerate(ranked, start=1):
        row = dict(row)
        row["rank"] = idx
        ranked[idx - 1] = row
    return ranked
