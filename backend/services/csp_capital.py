"""Capital budget enforcement vs user total_capital_budget (Settings)."""

from __future__ import annotations

from datetime import date

from backend.models.trade import Trade
from backend.models.user_preferences import DEFAULT_TOTAL_CAPITAL_BUDGET, UserPreferences
from backend.services.capital_invested import (
    compute_total_capital_invested,
    total_capital_invested_for_user,
)


def csp_notional(strike: float, contracts: int) -> float:
    return float(strike) * int(contracts) * 100


def get_capital_budget(user_id: str) -> float:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if row is not None and row.total_capital_budget is not None:
        return float(row.total_capital_budget)
    return float(DEFAULT_TOTAL_CAPITAL_BUDGET)


def capital_utilization_pct(invested: float, budget: float) -> float:
    if budget <= 0:
        return 0.0
    return invested / budget * 100.0


def capital_budget_error(
    user_id: str,
    *,
    pending_trade: Trade,
    exclude_trade_id: str | None = None,
    trades: list[Trade] | None = None,
    prior_status: str | None = None,
) -> str | None:
    """Block when a save would increase total capital invested above the user's budget."""
    all_trades = trades if trades is not None else Trade.query.filter_by(user_id=user_id).all()
    today = date.today()

    before = total_capital_invested_for_user(
        user_id,
        all_trades,
        exclude_trade_id=pending_trade.id,
        today=today,
    )
    after = total_capital_invested_for_user(
        user_id,
        all_trades,
        pending_trade=pending_trade,
        exclude_trade_id=exclude_trade_id,
        today=today,
    )

    before_for_compare = before
    if (
        prior_status == "OPEN"
        and pending_trade.status == "ASSIGNED"
        and pending_trade.option_type == "PUT"
    ):
        leg_csp = csp_notional(float(pending_trade.strike), int(pending_trade.contracts))
        active_open = (
            pending_trade.expiry is not None
            and pending_trade.expiry >= today
        )
        if not active_open:
            before_for_compare = before + leg_csp

    budget = get_capital_budget(user_id)
    if after <= budget + 1e-6:
        return None
    if after <= before_for_compare + 1e-6:
        return None

    over = after - budget
    pct = capital_utilization_pct(after, budget)
    return (
        f"Total capital invested ${after:,.0f} ({pct:.0f}% of budget) exceeds your "
        f"capital budget of ${budget:,.0f} (over by ${over:,.0f})"
    )


def csp_budget_error(
    user_id: str,
    *,
    option_type: str,
    status: str,
    strike: float,
    contracts: int,
    expiry: date,
    exclude_trade_id: str | None = None,
) -> str | None:
    """Legacy entry point — builds a synthetic pending trade for capital checks."""
    if str(option_type).upper() != "PUT" or str(status).upper() != "OPEN":
        return None
    if expiry < date.today():
        return None

    pending = Trade(
        id=exclude_trade_id or "__draft__",
        user_id=user_id,
        ticker="",
        option_type="PUT",
        strike=float(strike),
        expiry=expiry,
        trade_date=date.today(),
        premium=0.0,
        contracts=int(contracts),
        status="OPEN",
    )
    return capital_budget_error(
        user_id,
        pending_trade=pending,
        exclude_trade_id=exclude_trade_id,
    )
