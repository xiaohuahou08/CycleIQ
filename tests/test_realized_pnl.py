from datetime import date

import pytest

from backend.models.trade import Trade
from backend.services.capital_invested import (
    build_capital_trend_charts,
    build_monthly_capital_series,
    build_weekly_capital_series,
    compute_total_capital_pool,
)
from backend.services.realized_pnl import compute_realized_pnl, _effective_completion_date


def _put(**kwargs) -> Trade:
    base = dict(
        id="t1",
        user_id="u1",
        ticker="AAPL",
        option_type="PUT",
        strike=180.0,
        expiry=date(2026, 12, 19),
        trade_date=date(2026, 4, 29),
        premium=2.0,
        contracts=1,
        status="ASSIGNED",
    )
    base.update(kwargs)
    return Trade(**base)


def test_assigned_without_lifecycle_date_uses_trade_date_not_expiry():
    trade = _put(assigned_at=None)
    assert _effective_completion_date(trade) == date(2026, 4, 29)


def test_assigned_counts_before_option_expiry():
    trade = _put(assigned_at=None, expiry=date(2026, 12, 19))
    assert compute_realized_pnl([trade], date(2026, 6, 3)) == pytest.approx(200.0)


def test_monthly_capital_series_reflects_realized_pnl_by_month():
    trades = [
        _put(
            id="open",
            status="OPEN",
            trade_date=date(2026, 4, 27),
            expiry=date(2026, 7, 1),
            premium=1.2,
            contracts=2,
        ),
        _put(
            id="closed",
            status="CLOSED",
            trade_date=date(2026, 4, 28),
            expiry=date(2026, 7, 1),
            premium=1.5,
            contracts=3,
        ),
    ]
    series = build_monthly_capital_series(trades, 100_000, date(2026, 6, 26))
    labels = [p["label"] for p in series]
    assert "2026-04" in labels
    april = next(p for p in series if p["label"] == "2026-04")
    assert april["value"] == pytest.approx(100_450.0)
    assert series[-1]["value"] == pytest.approx(100_450.0)


def test_weekly_capital_series_includes_date_and_ytd_weeks():
    trades = [
        _put(
            id="closed",
            status="CLOSED",
            trade_date=date(2026, 4, 28),
            expiry=date(2026, 7, 1),
            premium=1.5,
            contracts=3,
        ),
    ]
    series = build_weekly_capital_series(trades, 100_000, date(2026, 6, 26))
    assert len(series) >= 20
    assert all("date" in p for p in series)
    assert series[-1]["value"] == pytest.approx(100_450.0)


def test_capital_trend_charts_bundle():
    charts = build_capital_trend_charts([], 50_000, date(2026, 6, 26))
    assert "weekly" in charts and "monthly" in charts
    assert charts["monthly"][-1]["value"] == pytest.approx(50_000.0)


def test_total_capital_includes_realized_pnl_from_completed_trades():
    trade = _put(status="EXPIRED", expired_at=None, premium=1.5, trade_date=date(2026, 5, 1))
    total = compute_total_capital_pool(100_000, [trade], date(2026, 6, 3))
    assert total == pytest.approx(100_150.0)
