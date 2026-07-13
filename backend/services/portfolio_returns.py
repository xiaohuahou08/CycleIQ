"""Portfolio return metrics: daily time-weighted return (Modified Dietz)."""

from __future__ import annotations

import bisect
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from backend.models.trade import Trade
from backend.services.realized_pnl import (
    PNL_STATUSES,
    _effective_completion_date,
    _realized_cashflow,
    compute_realized_pnl_as_of,
)


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


def _assignment_strike_per_share(tt: list[Trade]) -> float | None:
    """Weighted CSP assignment strike (purchase price) for call-away stock P&L."""
    assigned_puts = [
        t
        for t in tt
        if t.option_type == "PUT" and t.status in ("ASSIGNED", "CALLED_AWAY")
    ]
    if not assigned_puts:
        return None
    assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
    if assigned_shares <= 0:
        return None
    return (
        sum(float(t.strike) * int(t.contracts) * 100 for t in assigned_puts)
        / assigned_shares
    )


def _leg_realized_pnl(t: Trade, assignment_strike_per_share: float | None) -> float:
    pnl = _realized_cashflow(t)
    if (
        t.option_type == "CALL"
        and t.status == "CALLED_AWAY"
        and assignment_strike_per_share is not None
    ):
        # Stock sold at CC strike vs bought at CSP strike (premiums in cashflow only).
        pnl += (float(t.strike) - assignment_strike_per_share) * int(t.contracts) * 100
    return pnl


@dataclass
class _PnlTimeline:
    dates: list[date]
    cumulative: list[float]

    @classmethod
    def from_trades(cls, trades: list[Trade], today: date) -> _PnlTimeline:
        by_ticker: dict[str, list[Trade]] = defaultdict(list)
        for t in trades:
            by_ticker[t.ticker].append(t)
        assignment_strike = {
            ticker: strike
            for ticker, tt in by_ticker.items()
            if (strike := _assignment_strike_per_share(tt)) is not None
        }

        deltas: dict[date, float] = defaultdict(float)
        for t in trades:
            if t.status not in PNL_STATUSES:
                continue
            completion = _effective_completion_date(t)
            if completion > today:
                continue
            deltas[completion] += _leg_realized_pnl(
                t, assignment_strike.get(t.ticker)
            )

        dates = sorted(deltas.keys())
        running = 0.0
        cumulative: list[float] = []
        for d in dates:
            running += deltas[d]
            cumulative.append(running)
        return cls(dates=dates, cumulative=cumulative)

    def as_of(self, day: date) -> float:
        if not self.dates:
            return 0.0
        idx = bisect.bisect_right(self.dates, day) - 1
        if idx < 0:
            return 0.0
        return self.cumulative[idx]


def nav_at_start_of_day(
    day: date,
    current_budget: float,
    flows: list[CapitalFlowEvent],
    trades: list[Trade],
    *,
    pnl_timeline: _PnlTimeline | None = None,
    today: date | None = None,
) -> float:
    prev = day - timedelta(days=1)
    budget = budget_at_start_of_day(day, current_budget, flows)
    if pnl_timeline is not None:
        pnl = pnl_timeline.as_of(prev)
    else:
        pnl = compute_realized_pnl_as_of(trades, prev)
    return budget + pnl


def nav_at_end_of_day(
    day: date,
    current_budget: float,
    flows: list[CapitalFlowEvent],
    trades: list[Trade],
    *,
    pnl_timeline: _PnlTimeline | None = None,
    today: date | None = None,
) -> float:
    _ = today
    budget = budget_at_end_of_day(day, current_budget, flows)
    if pnl_timeline is not None:
        pnl = pnl_timeline.as_of(day)
    else:
        pnl = compute_realized_pnl_as_of(trades, day)
    return budget + pnl


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


def _event_dates(
    trades: list[Trade],
    flows: list[CapitalFlowEvent],
    start: date,
    today: date,
    pnl_timeline: _PnlTimeline,
) -> list[date]:
    dates = {start, today}
    dates.update(f.event_date for f in flows if start <= f.event_date <= today)
    dates.update(d for d in pnl_timeline.dates if start <= d <= today)
    return sorted(dates)


def modified_dietz_twr_pct(
    daily_points: list[tuple[float, float, float]],
) -> float:
    """
    Chain daily Modified Dietz returns.

    Each tuple is (nav_start, net_inflow, nav_end).
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
    """
    today = today or date.today()
    start = _measurement_start(trades, flows, today)
    if start is None or start > today:
        return 0.0, 0.0, False

    pnl_timeline = _PnlTimeline.from_trades(trades, today)
    event_days = _event_dates(trades, flows, start, today, pnl_timeline)

    daily_points: list[tuple[float, float, float]] = []
    total_net_inflow = sum(
        f.amount for f in flows if start <= f.event_date <= today
    )
    begin_nav = 0.0

    for day in event_days:
        inflow = net_inflow_on_day(day, flows)
        nav_start = nav_at_start_of_day(
            day, current_budget, flows, trades, pnl_timeline=pnl_timeline
        )
        nav_end = nav_at_end_of_day(
            day, current_budget, flows, trades, pnl_timeline=pnl_timeline
        )
        if day == start:
            begin_nav = nav_start if nav_start > 0 else nav_end - inflow
        daily_points.append((nav_start, inflow, nav_end))

    twr_pct = modified_dietz_twr_pct(daily_points)
    end_nav = daily_points[-1][2] if daily_points else begin_nav
    if begin_nav > 0:
        total_return_pct = (end_nav - begin_nav - total_net_inflow) / begin_nav * 100.0
    else:
        total_return_pct = 0.0

    unreliable = _twr_unreliable(twr_pct, total_return_pct, total_net_inflow, begin_nav)
    return twr_pct, total_return_pct, unreliable
