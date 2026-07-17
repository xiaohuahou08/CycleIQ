"""Unit tests for unrealized assigned-share MTM."""

from datetime import date

import pytest

from backend.models.trade import Trade
from backend.services.stock_mtm import (
    compute_unrealized_stock_mtm,
    open_assigned_positions,
    tickers_needing_quotes,
)


def _put(**kwargs) -> Trade:
    base = dict(
        id="put1",
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


def _call(**kwargs) -> Trade:
    base = dict(
        id="cc1",
        user_id="u1",
        ticker="AAPL",
        option_type="CALL",
        strike=190.0,
        expiry=date(2026, 12, 19),
        trade_date=date(2026, 5, 1),
        premium=1.0,
        contracts=1,
        status="OPEN",
    )
    base.update(kwargs)
    return Trade(**base)


def test_open_assigned_position_after_csp_assignment():
    trades = [_put()]
    assert open_assigned_positions(trades) == [("AAPL", 100, 180.0)]
    assert tickers_needing_quotes(trades) == ["AAPL"]


def test_mtm_with_live_price():
    trades = [_put()]
    # (185 − 180) × 100 = 500
    assert compute_unrealized_stock_mtm(trades, {"AAPL": 185.0}) == pytest.approx(500.0)


def test_mtm_skipped_without_quote():
    trades = [_put()]
    assert compute_unrealized_stock_mtm(trades, {}) == pytest.approx(0.0)


def test_mtm_partial_call_away():
    trades = [
        _put(contracts=2),  # 200 shares @ 180
        _call(id="away", status="CALLED_AWAY", strike=190.0, contracts=1),  # 100 sold
    ]
    positions = open_assigned_positions(trades)
    assert positions == [("AAPL", 100, 180.0)]
    # remaining 100 @ (175 − 180) = −500
    assert compute_unrealized_stock_mtm(trades, {"AAPL": 175.0}) == pytest.approx(-500.0)


def test_fully_called_away_needs_no_quote():
    trades = [
        _put(),
        _call(status="CALLED_AWAY", strike=185.0),
    ]
    assert open_assigned_positions(trades) == []
    assert tickers_needing_quotes(trades) == []
    assert compute_unrealized_stock_mtm(trades, {"AAPL": 200.0}) == pytest.approx(0.0)
