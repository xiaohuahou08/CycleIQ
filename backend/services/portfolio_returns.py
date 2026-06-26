"""Portfolio return metrics: daily time-weighted return (Modified Dietz)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from backend.models.trade import Trade
from backend.services.capital_invested import compute_total_capital_pool


@dataclass(frozen=True)
class CapitalFlowEvent:
    event_date: date
    amount: float


def budget_at_start_of_day(
    day: date, current_budget: float, flows: list[CapitalFlowEvent]
) -> float:
    """Budget before any flows recorded on ``day``."""
    return current_budget - sum(f.amount for f in flows if f.event_date >= day)


def budget_at_end_of_day(
    day: date, current_budget: float, flows: list[CapitalFlowEvent]
) -> float:
    """Budget after flows recorded on ``day``."""
    return current_budget - sum(f.amount for f in flows if f.event_date > day)


def net_inflow_on_day(day: date, flows: list[CapitalFlowEvent]) -> float:
    return sum(f.amount for f in flows if f.event_date == day)


def nav_at_start_of_day(
    day: date,
    current_budget: float,
    flows: list[CapitalFlowEvent],
    trades: list[Trade],
) -> float:
    prev = day - timedelta(days=1)
    budget = budget_at_start_of_day(day, current_budget, flows)
    pnl = compute_total_capital_pool(budget, trades, prev) - budget
    return budget + pnl


def nav_at_end_of_day(
    day: date,
    current_budget: float,
    flows: list[CapitalFlowEvent],
    trades: list[Trade],
) -> float:
    budget = budget_at_end_of_day(day, current_budget, flows)
    return compute_total_capital_pool(budget, trades, day)


def _measurement_start(
    trades: list[Trade], flows: list[CapitalFlowEvent], today: date
) -> date | None:
    dates: list[date] = []
    for t in trades:
        if t.trade_date is not None:
            dates.append(t.trade_date)
    dates.extend(f.event_date for f in flows)
    if not dates:
        return None
    return min(dates)


def modified_dietz_twr_pct(
    daily_points: list[tuple[float, float, float]],
) -> float:
    """
    Chain daily Modified Dietz returns.

    Each tuple is (nav_start, net_inflow, nav_end).
    daily_return = (nav_end - nav_start - net_inflow) / (nav_start + 0.5 * net_inflow)
      TWR = [Π(1 + daily_return) - 1] × 100
    """
    product = 1.0
    for nav_start, net_inflow, nav_end in daily_points:
        daily_gain = nav_end - nav_start - net_inflow
        denominator = nav_start + 0.5 * net_inflow
        if denominator > 0:
            product *= 1.0 + daily_gain / denominator
    return (product - 1.0) * 100.0


def _twr_unreliable(
    twr_pct: float,
    total_return_pct: float,
    total_net_inflow: float,
    begin_nav: float,
) -> bool:
    if begin_nav <= 0:
        return False
    if twr_pct == 0.0 and total_return_pct == 0.0:
        return False
    if twr_pct * total_return_pct >= 0:
        return False
    return abs(total_net_inflow) >= 0.25 * begin_nav


def compute_time_weighted_return(
    trades: list[Trade],
    flows: list[CapitalFlowEvent],
    current_budget: float,
    today: date | None = None,
) -> tuple[float, float, bool]:
    """
    Daily time-weighted return from total capital (budget + realized P&L).

    Returns (twr_pct, cumulative_total_return_pct, unreliable_flag).
    cumulative_total_return_pct = (end_nav - begin_nav - Σ inflows) / begin_nav × 100
    """
    today = today or date.today()
    start = _measurement_start(trades, flows, today)
    if start is None or start > today:
        return 0.0, 0.0, False

    daily_points: list[tuple[float, float, float]] = []
    total_net_inflow = 0.0
    begin_nav = 0.0

    day = start
    while day <= today:
        inflow = net_inflow_on_day(day, flows)
        total_net_inflow += inflow
        nav_start = nav_at_start_of_day(day, current_budget, flows, trades)
        nav_end = nav_at_end_of_day(day, current_budget, flows, trades)
        if day == start:
            begin_nav = nav_start if nav_start > 0 else nav_end - inflow
        daily_points.append((nav_start, inflow, nav_end))
        day += timedelta(days=1)

    twr_pct = modified_dietz_twr_pct(daily_points)
    end_nav = daily_points[-1][2] if daily_points else begin_nav
    if begin_nav > 0:
        total_return_pct = (end_nav - begin_nav - total_net_inflow) / begin_nav * 100.0
    else:
        total_return_pct = 0.0

    unreliable = _twr_unreliable(twr_pct, total_return_pct, total_net_inflow, begin_nav)
    return twr_pct, total_return_pct, unreliable
