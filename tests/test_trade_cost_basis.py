"""Unit tests for CSP stock cost basis computation."""

from __future__ import annotations

from datetime import date

import pytest

from backend.models.trade import Trade
from backend.services.trade_cost_basis import apply_stock_cost_basis


def _put(**overrides) -> Trade:
    base = dict(
        user_id="00000000-0000-0000-0000-000000000001",
        ticker="UNH",
        option_type="PUT",
        strike=390.0,
        expiry=date(2026, 6, 20),
        trade_date=date(2026, 4, 1),
        premium=2.5,
        contracts=1,
        status="ASSIGNED",
    )
    base.update(overrides)
    return Trade(**base)


def test_apply_stock_cost_basis_assigned_put_with_fees_and_roll():
    trade = _put(
        premium=2.5,
        prior_roll_premium_per_share=1.0,
        commission_fee=0.65,
        fees_on_assignment=5.0,
    )
    apply_stock_cost_basis(trade)
    # 390 − 2.5 − 1.0 + (0.65 + 5.0) / 100
    expected = 390.0 - 2.5 - 1.0 + (0.65 + 5.0) / 100
    assert trade.stock_cost_basis_per_share == pytest.approx(expected, abs=1e-4)


def test_apply_stock_cost_basis_called_away_put_keeps_basis():
    trade = _put(status="CALLED_AWAY", premium=1.2, commission_fee=0.19)
    apply_stock_cost_basis(trade)
    expected = 390.0 - 1.2 + 0.19 / 100
    assert trade.stock_cost_basis_per_share == pytest.approx(expected, abs=1e-4)


def test_apply_stock_cost_basis_clears_non_put():
    trade = _put(option_type="CALL", status="EXPIRED")
    apply_stock_cost_basis(trade)
    assert trade.stock_cost_basis_per_share is None


def test_apply_stock_cost_basis_clears_open_put():
    trade = _put(status="OPEN")
    apply_stock_cost_basis(trade)
    assert trade.stock_cost_basis_per_share is None
