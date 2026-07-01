"""Premium entitlement is derived from live subscription state, not cached plan."""

from datetime import datetime, timedelta, timezone

import pytest

pytest.importorskip("flask_sqlalchemy")

from backend.models.user_preferences import UserPreferences
from backend.services.trade_limits import (
    BASIC_PLAN,
    PREMIUM_PLAN,
    is_premium,
)

NOW = datetime(2026, 6, 27, tzinfo=timezone.utc)
FUTURE = NOW + timedelta(days=30)
PAST = NOW - timedelta(days=1)


def _row(**kwargs) -> UserPreferences:
    return UserPreferences(user_id="u", **kwargs)


def test_none_row_is_not_premium():
    assert is_premium(None, now=NOW) is False


def test_active_subscription_with_future_period_is_premium():
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="active",
        stripe_subscription_id="sub_1",
        current_period_end=FUTURE,
    )
    assert is_premium(row, now=NOW) is True


def test_trialing_subscription_is_premium():
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="trialing",
        stripe_subscription_id="sub_1",
        current_period_end=FUTURE,
    )
    assert is_premium(row, now=NOW) is True


def test_active_status_with_expired_period_is_not_premium():
    """Missed renewal-failure webhook: status stale 'active' but period lapsed."""
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="active",
        stripe_subscription_id="sub_1",
        current_period_end=PAST,
    )
    assert is_premium(row, now=NOW) is False


def test_active_status_without_period_is_premium():
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="active",
        stripe_subscription_id="sub_1",
        current_period_end=None,
    )
    assert is_premium(row, now=NOW) is True


def test_canceled_status_with_stale_premium_plan_is_not_premium():
    """The core fix: cached plan='premium' must not grant access once canceled."""
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="canceled",
        stripe_subscription_id="sub_1",
        current_period_end=FUTURE,
    )
    assert is_premium(row, now=NOW) is False


def test_comped_account_without_subscription_is_premium():
    """Manual/admin grant: plan set directly, no Stripe subscription on file."""
    row = _row(plan=PREMIUM_PLAN, subscription_status=None, stripe_subscription_id=None)
    assert is_premium(row, now=NOW) is True


def test_basic_plan_is_not_premium():
    row = _row(plan=BASIC_PLAN)
    assert is_premium(row, now=NOW) is False


def test_naive_period_end_treated_as_utc():
    row = _row(
        plan=PREMIUM_PLAN,
        subscription_status="active",
        stripe_subscription_id="sub_1",
        current_period_end=FUTURE.replace(tzinfo=None),
    )
    assert is_premium(row, now=NOW) is True
