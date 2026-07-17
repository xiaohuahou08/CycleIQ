from datetime import date

import pytest

from backend.models.trade import Trade
from backend.services.portfolio_returns import (
    CapitalFlowEvent,
    _twr_unreliable,
    compute_time_weighted_return,
    modified_dietz_twr_pct,
)


def test_modified_dietz_user_example():
    """Classic TWR vs total return divergence with large same-day deposit."""
    twr = modified_dietz_twr_pct(
        [
            (100.0, 0.0, 150.0),
            (150.0, 1000.0, 1050.0),
        ]
    )
    assert twr == pytest.approx(26.93, abs=0.01)


def test_modified_dietz_single_day_no_flow():
    twr = modified_dietz_twr_pct([(100.0, 0.0, 150.0)])
    assert twr == pytest.approx(50.0, abs=0.01)


def _put(**kwargs) -> Trade:
    base = dict(
        id="t1",
        user_id="u1",
        ticker="AAPL",
        option_type="PUT",
        strike=100.0,
        expiry=date(2026, 12, 19),
        trade_date=date(2026, 4, 1),
        premium=2.0,
        contracts=1,
        status="CLOSED",
    )
    base.update(kwargs)
    return Trade(**base)


def test_time_weighted_return_from_trades_no_flows():
    trade = _put(
        trade_date=date(2026, 4, 1),
        closed_at=date(2026, 4, 2),
        premium=5.0,
        contracts=1,
        strike=100.0,
    )
    budget = 100_000.0
    twr, total_ret, unreliable = compute_time_weighted_return(
        [trade], [], budget, date(2026, 4, 5)
    )
    # PnL 500 realized Apr 2; budget flat → TWR matches cumulative total return.
    assert twr == pytest.approx(0.5, abs=0.01)
    assert total_ret == pytest.approx(0.5, abs=0.01)
    assert unreliable is False


def test_time_weighted_return_includes_today_unrealized_mtm():
    trade = _put(
        trade_date=date(2026, 4, 1),
        closed_at=date(2026, 4, 2),
        premium=5.0,
        contracts=1,
        strike=100.0,
    )
    budget = 100_000.0
    # Extra $500 MTM on as-of day → total return 1.0%
    twr, total_ret, unreliable = compute_time_weighted_return(
        [trade], [], budget, date(2026, 4, 5), unrealized_mtm=500.0
    )
    assert total_ret == pytest.approx(1.0, abs=0.01)
    assert twr == pytest.approx(1.0, abs=0.01)
    assert unreliable is False


def test_twr_unreliable_when_signs_differ_after_large_flows():
    assert _twr_unreliable(26.93, -50.0, 1000.0, 100.0) is True
    assert _twr_unreliable(26.93, -50.0, 10.0, 100.0) is False
    assert _twr_unreliable(10.0, 5.0, 1000.0, 100.0) is False
