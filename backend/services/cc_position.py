"""Covered-call position checks: CC requires assigned stock from CSP."""

from __future__ import annotations

from backend.models.trade import Trade


def _assigned_puts(trades: list[Trade]) -> list[Trade]:
    return [
        t
        for t in trades
        if t.option_type == "PUT"
        and t.status in ("ASSIGNED", "CALLED_AWAY")
        and t.stock_cost_basis_per_share is not None
    ]


def available_cc_shares(
    trades: list[Trade],
    ticker: str,
    *,
    exclude_trade_id: str | None = None,
) -> int:
    """Shares still available to write new OPEN covered calls for *ticker*."""
    sym = ticker.strip().upper()
    tt = [t for t in trades if t.ticker == sym]
    assigned_puts = _assigned_puts(tt)
    if not assigned_puts:
        return 0

    assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
    called_away_shares = sum(
        int(t.contracts) * 100
        for t in tt
        if t.option_type == "CALL" and t.status == "CALLED_AWAY"
    )
    open_cc_shares = sum(
        int(t.contracts) * 100
        for t in tt
        if t.option_type == "CALL"
        and t.status == "OPEN"
        and (exclude_trade_id is None or t.id != exclude_trade_id)
    )
    return max(0, assigned_shares - called_away_shares - open_cc_shares)


def cc_position_error(
    user_id: str,
    ticker: str,
    contracts: int,
    *,
    exclude_trade_id: str | None = None,
) -> str | None:
    """Return an error message when an OPEN CC exceeds assigned stock, else None."""
    if int(contracts) < 1:
        return None

    sym = ticker.strip().upper()
    trades = Trade.query.filter_by(user_id=user_id, ticker=sym).all()
    available = available_cc_shares(trades, sym, exclude_trade_id=exclude_trade_id)
    needed = int(contracts) * 100
    if available >= needed:
        return None
    if available <= 0:
        return (
            f"No assigned stock for {sym}. A covered call requires shares from a prior CSP assignment."
        )
    return (
        f"Not enough assigned shares for {sym}: need {needed} shares "
        f"but only {available} available for covered calls."
    )
