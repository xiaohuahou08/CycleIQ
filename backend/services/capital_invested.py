"""Total capital invested: open CSP notional + effective stock holding cost."""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta

from backend.models.trade import Trade
from backend.services.portfolio_returns import CapitalFlowEvent, budget_at_end_of_day
from backend.services.realized_pnl import compute_realized_pnl_as_of
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


def _put_csp_open_on_as_of(t: Trade, as_of: date) -> bool:
    if t.option_type != "PUT" or t.trade_date is None or t.trade_date > as_of:
        return False
    if t.expiry is not None and t.expiry < as_of:
        return False

    if t.status == "OPEN":
        return True

    if t.status in ("ASSIGNED", "CALLED_AWAY"):
        assign = t.assigned_at or _completion_date(t)
        return t.trade_date <= as_of < assign

    if t.status in ("CLOSED", "EXPIRED", "ROLLED"):
        end = _completion_date(t)
        if t.status == "CLOSED" and t.closed_at is None:
            end = t.trade_date
        elif t.status == "EXPIRED" and t.expired_at is None:
            end = t.trade_date
        elif t.status == "ROLLED" and t.rolled_at is None:
            end = t.trade_date
        return t.trade_date <= as_of <= end

    return False


def compute_open_csp_capital_as_of(trades: list[Trade], as_of: date) -> float:
    return sum(
        float(t.strike) * int(t.contracts) * 100
        for t in trades
        if _put_csp_open_on_as_of(t, as_of)
    )


def compute_stock_effective_cost_as_of(trades: list[Trade], as_of: date) -> float:
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
            and (t.assigned_at or _completion_date(t)) <= as_of
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
            if t.option_type == "CALL"
            and t.status in ("OPEN", "EXPIRED", "CLOSED", "ROLLED")
            and (t.status == "OPEN" or _completion_date(t) <= as_of)
            and (t.status != "OPEN" or t.trade_date <= as_of)
        ]
        cc_reduction_net = sum(_realized_cashflow(t) for t in basis_reducing_ccs)
        cc_reduction_per_share = cc_reduction_net / assigned_shares
        effective_basis_per_share = max(0.0, weighted_initial_basis - cc_reduction_per_share)

        called_away_ccs = [
            t
            for t in tt
            if t.option_type == "CALL"
            and t.status == "CALLED_AWAY"
            and (t.called_away_at or _completion_date(t)) <= as_of
        ]
        called_away_shares = sum(int(t.contracts) * 100 for t in called_away_ccs)
        remaining_shares = assigned_shares - called_away_shares
        if remaining_shares > 0:
            total_stock_effective_cost += effective_basis_per_share * remaining_shares

    return total_stock_effective_cost


def compute_total_capital_invested_as_of(trades: list[Trade], as_of: date) -> float:
    return compute_open_csp_capital_as_of(trades, as_of) + compute_stock_effective_cost_as_of(
        trades, as_of
    )


def compute_total_capital_pool(
    budget: float,
    trades: list[Trade],
    as_of: date,
    *,
    unrealized_mtm: float = 0.0,
) -> float:
    """Total capital = budget + realized P&L (+ optional open-share MTM)."""
    return float(budget) + compute_realized_pnl_as_of(trades, as_of) + float(unrealized_mtm or 0.0)


def _month_end(year: int, month: int, cap: date) -> date:
    if year == cap.year and month == cap.month:
        return cap
    return date(year, month, monthrange(year, month)[1])


def _start_of_week_monday(d: date) -> date:
    return d.fromordinal(d.toordinal() - d.weekday())


def _week_end(monday: date, cap: date) -> date:
    return min(monday.fromordinal(monday.toordinal() + 6), cap)


def _one_year_start(today: date) -> date:
    return today - timedelta(days=364)


def _trend_series_start(today: date) -> date:
    """Earliest snapshot date returned by the API (covers both YTD and 1Y filters)."""
    return min(_one_year_start(today), date(today.year, 1, 1))


def _capital_point(
    current_budget: float,
    flows: list[CapitalFlowEvent],
    trades: list[Trade],
    as_of: date,
    label: str,
) -> dict:
    budget = budget_at_end_of_day(as_of, current_budget, flows)
    return {
        "label": label,
        "date": as_of.isoformat(),
        "value": round(compute_total_capital_pool(budget, trades, as_of), 2),
    }


def build_weekly_capital_series(
    trades: list[Trade],
    budget: float,
    today: date | None = None,
    flows: list[CapitalFlowEvent] | None = None,
) -> list[dict]:
    today = today or date.today()
    flow_events = flows or []
    start_monday = _start_of_week_monday(_trend_series_start(today))
    end_monday = _start_of_week_monday(today)

    points: list[dict] = []
    monday = start_monday
    while monday <= end_monday:
        as_of = _week_end(monday, today)
        points.append(
            _capital_point(budget, flow_events, trades, as_of, as_of.strftime("%b %d"))
        )
        monday = monday.fromordinal(monday.toordinal() + 7)
    return points


def build_monthly_capital_series(
    trades: list[Trade],
    budget: float,
    today: date | None = None,
    limit: int | None = None,
    flows: list[CapitalFlowEvent] | None = None,
) -> list[dict]:
    today = today or date.today()
    flow_events = flows or []
    start = _trend_series_start(today)
    year, month = start.year, start.month

    points: list[dict] = []
    while (year, month) <= (today.year, today.month):
        as_of = _month_end(year, month, today)
        points.append(
            _capital_point(
                budget, flow_events, trades, as_of, f"{year:04d}-{month:02d}"
            )
        )
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1

    if limit is not None:
        points = points[-limit:]
    return points


def build_capital_trend_charts(
    trades: list[Trade],
    budget: float,
    today: date | None = None,
    flows: list[CapitalFlowEvent] | None = None,
    *,
    unrealized_mtm: float = 0.0,
) -> dict[str, list[dict]]:
    today = today or date.today()
    flow_events = flows or []
    weekly = build_weekly_capital_series(trades, budget, today, flow_events)
    monthly = build_monthly_capital_series(trades, budget, today, flows=flow_events)
    mtm = float(unrealized_mtm or 0.0)
    if mtm != 0.0:
        # Only the latest snapshot includes live marks (no historical prices).
        if weekly:
            weekly[-1] = {**weekly[-1], "value": round(weekly[-1]["value"] + mtm, 2)}
        if monthly:
            monthly[-1] = {**monthly[-1], "value": round(monthly[-1]["value"] + mtm, 2)}
    return {"weekly": weekly, "monthly": monthly}


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
            if t.option_type == "CALL" and t.status in ("OPEN", "EXPIRED", "CLOSED", "ROLLED")
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
