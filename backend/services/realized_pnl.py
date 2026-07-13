"""Realized P&L from closed option legs and stock call-aways."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from backend.models.trade import Trade

PNL_STATUSES = frozenset({"CLOSED", "EXPIRED", "ROLLED", "CALLED_AWAY", "ASSIGNED"})


def _premium_total(t: Trade) -> float:
    return float(t.premium) * int(t.contracts) * 100


def _realized_cashflow(t: Trade) -> float:
    buyback_total = float(getattr(t, "buyback_cost_per_share", None) or 0) * int(t.contracts) * 100
    commission = float(t.commission_fee) if t.commission_fee is not None else 0.0
    assignment_fees = (
        float(t.fees_on_assignment) if getattr(t, "fees_on_assignment", None) is not None else 0.0
    )
    return _premium_total(t) - commission - assignment_fees - buyback_total


def _completion_date(t: Trade) -> date:
    if t.status == "EXPIRED" and t.expired_at is not None:
        return t.expired_at
    if t.status == "CLOSED" and t.closed_at is not None:
        return t.closed_at
    if t.status == "ASSIGNED" and t.assigned_at is not None:
        return t.assigned_at
    if t.status == "CALLED_AWAY" and t.called_away_at is not None:
        return t.called_away_at
    if t.status == "ROLLED" and t.rolled_at is not None:
        return t.rolled_at
    if t.expired_at is not None:
        return t.expired_at
    return t.expiry


def _effective_completion_date(t: Trade) -> date:
    if t.status == "EXPIRED" and t.expired_at is not None:
        return t.expired_at
    if t.status == "CLOSED" and t.closed_at is not None:
        return t.closed_at
    if t.status == "ASSIGNED" and t.assigned_at is not None:
        return t.assigned_at
    if t.status == "CALLED_AWAY" and t.called_away_at is not None:
        return t.called_away_at
    if t.status == "ROLLED" and t.rolled_at is not None:
        return t.rolled_at
    # Terminal leg without an explicit lifecycle date — use trade date, not expiry.
    if t.status in PNL_STATUSES and t.trade_date is not None:
        return t.trade_date
    return _completion_date(t)


def _stock_sale_pnl_as_of(trades: list[Trade], as_of: date) -> float:
    """Stock P&L when CC shares are called away.

    Gain = (callaway_strike − CSP assignment strike) × shares.
    Uses the put **strike** (purchase price), not premium-reduced cost basis —
    CSP/roll premiums are already counted in option cashflows.
    """
    by_ticker: dict[str, list[Trade]] = defaultdict(list)
    for t in trades:
        by_ticker[t.ticker].append(t)

    extra = 0.0
    for tt in by_ticker.values():
        assigned_puts = [
            t
            for t in tt
            if t.option_type == "PUT"
            and t.status in ("ASSIGNED", "CALLED_AWAY")
            and _effective_completion_date(t) <= as_of
        ]
        if not assigned_puts:
            continue

        assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
        if assigned_shares <= 0:
            continue

        weighted_assignment_strike = (
            sum(float(t.strike) * int(t.contracts) * 100 for t in assigned_puts)
            / assigned_shares
        )

        called_away_ccs = [
            t
            for t in tt
            if t.option_type == "CALL"
            and t.status == "CALLED_AWAY"
            and _effective_completion_date(t) <= as_of
        ]
        for cc in called_away_ccs:
            shares_called = int(cc.contracts) * 100
            extra += (float(cc.strike) - weighted_assignment_strike) * shares_called

    return extra


def compute_realized_pnl_as_of(trades: list[Trade], as_of: date) -> float:
    realized_trades = [
        t
        for t in trades
        if t.status in PNL_STATUSES and _effective_completion_date(t) <= as_of
    ]
    option_pnl = sum(_realized_cashflow(t) for t in realized_trades)
    return option_pnl + _stock_sale_pnl_as_of(trades, as_of)


def compute_realized_pnl(trades: list[Trade], today: date | None = None) -> float:
    return compute_realized_pnl_as_of(trades, today or date.today())
