"""Open CSP cash-secured notional vs user capital budget."""

from __future__ import annotations

from datetime import date

from backend.models.trade import Trade
from backend.models.user_preferences import DEFAULT_TOTAL_CAPITAL_BUDGET, UserPreferences


def csp_notional(strike: float, contracts: int) -> float:
    return float(strike) * int(contracts) * 100


def get_capital_budget(user_id: str) -> float:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if row is not None and row.total_capital_budget is not None:
        return float(row.total_capital_budget)
    return float(DEFAULT_TOTAL_CAPITAL_BUDGET)


def sum_open_csp_notional(
    user_id: str,
    *,
    exclude_trade_id: str | None = None,
    as_of: date | None = None,
) -> float:
    """Sum strike×shares for OPEN puts with expiry on or after `as_of`."""
    today = as_of or date.today()
    q = Trade.query.filter_by(user_id=user_id, option_type="PUT", status="OPEN").filter(
        Trade.expiry >= today
    )
    if exclude_trade_id:
        q = q.filter(Trade.id != exclude_trade_id)
    return sum(csp_notional(float(t.strike), int(t.contracts)) for t in q.all())


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
    """Return an error message if this leg would exceed the CSP capital budget."""
    if str(option_type).upper() != "PUT" or str(status).upper() != "OPEN":
        return None
    if expiry < date.today():
        return None

    budget = get_capital_budget(user_id)
    used = sum_open_csp_notional(user_id, exclude_trade_id=exclude_trade_id)
    total = used + csp_notional(strike, contracts)
    if total <= budget + 1e-6:
        return None

    over = total - budget
    return (
        f"Open CSP cash requirement ${total:,.0f} exceeds your capital budget "
        f"of ${budget:,.0f} (over by ${over:,.0f})"
    )
