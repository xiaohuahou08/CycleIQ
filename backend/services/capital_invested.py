"""Total capital invested: open CSP notional + effective stock holding cost."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from backend.models.trade import Trade
from backend.services.trade_cost_basis import apply_stock_cost_basis


def _premium_total(t: Trade) -> float:
    return float(t.premium) * int(t.contracts) * 100


def _realized_cashflow(t: Trade) -> float:
    buyback_total = float(getattr(t, "buyback_cost_per_share", None) or 0) * int(t.contracts) * 100
    commission = float(t.commission_fee) if t.commission_fee is not None else 0.0
    assignment_fees = (
        float(t.fees_on_assignment) if getattr(t, "fees_on_assignment", None) is not None else 0.0
    )
    return _premium_total(t) - commission - assignment_fees - buyback_total


def compute_stock_effective_cost(trades: list[Trade], today: date | None = None) -> float:
    """Effective USD cost of stock still held after assignment (post CC basis reduction)."""
    _ = today  # reserved for future as-of semantics; matches dashboard live view
    by_ticker: dict[str, list[Trade]] = defaultdict(list)
    for t in trades:
        by_ticker[t.ticker].append(t)

    total_stock_effective_cost = 0.0
    for tt in by_ticker.values():
        assigned_puts = [
            t
            for t in tt
            if t.option_type == "PUT"
            and t.status in ("ASSIGNED", "CALLED_AWAY")
            and t.stock_cost_basis_per_share is not None
        ]
        if not assigned_puts:
            continue

        assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
        if assigned_shares <= 0:
            continue

        weighted_initial_basis = (
            sum(
                float(t.stock_cost_basis_per_share) * int(t.contracts) * 100
                for t in assigned_puts
            )
            / assigned_shares
        )

        basis_reducing_ccs = [
            t
            for t in tt
            if t.option_type == "CALL" and t.status in ("EXPIRED", "CLOSED", "ROLLED")
        ]
        cc_reduction_net = sum(_realized_cashflow(t) for t in basis_reducing_ccs)
        cc_reduction_per_share = cc_reduction_net / assigned_shares
        effective_basis_per_share = max(0.0, weighted_initial_basis - cc_reduction_per_share)

        called_away_ccs = [t for t in tt if t.option_type == "CALL" and t.status == "CALLED_AWAY"]
        called_away_shares = sum(int(t.contracts) * 100 for t in called_away_ccs)
        remaining_shares = assigned_shares - called_away_shares
        if remaining_shares > 0:
            total_stock_effective_cost += effective_basis_per_share * remaining_shares

    return total_stock_effective_cost


def compute_open_csp_capital(trades: list[Trade], today: date | None = None) -> float:
    today = today or date.today()
    open_puts = [
        t
        for t in trades
        if t.option_type == "PUT"
        and t.status == "OPEN"
        and t.expiry is not None
        and t.expiry >= today
    ]
    return sum(float(t.strike) * int(t.contracts) * 100 for t in open_puts)


def compute_total_capital_invested(trades: list[Trade], today: date | None = None) -> float:
    today = today or date.today()
    return compute_open_csp_capital(trades, today) + compute_stock_effective_cost(trades, today)


def _prepare_trades_for_capital_calc(
    trades: list[Trade],
    *,
    pending_trade: Trade | None = None,
    exclude_trade_id: str | None = None,
) -> list[Trade]:
    working = [t for t in trades if t.id != exclude_trade_id]
    if pending_trade is None:
        return working

    replaced = False
    for i, t in enumerate(working):
        if t.id == pending_trade.id:
            working[i] = pending_trade
            replaced = True
            break
    if not replaced:
        working.append(pending_trade)

    for t in working:
        if t.option_type == "PUT" and t.status in ("ASSIGNED", "CALLED_AWAY"):
            apply_stock_cost_basis(t)
    return working


def total_capital_invested_for_user(
    user_id: str,
    trades: list[Trade],
    *,
    pending_trade: Trade | None = None,
    exclude_trade_id: str | None = None,
    today: date | None = None,
) -> float:
    prepared = _prepare_trades_for_capital_calc(
        trades,
        pending_trade=pending_trade,
        exclude_trade_id=exclude_trade_id,
    )
    return compute_total_capital_invested(prepared, today)
