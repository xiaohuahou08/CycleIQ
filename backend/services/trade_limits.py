from __future__ import annotations

from datetime import datetime, timezone

from backend.models.trade import Trade
from backend.models.user_preferences import UserPreferences

BASIC_PLAN = "basic"
PREMIUM_PLAN = "premium"
BASIC_MONTHLY_TRADE_LIMIT = 20

# Subscription statuses that grant premium entitlement.
PREMIUM_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing"})

PLAN_LABELS = {
    BASIC_PLAN: "Basic",
    PREMIUM_PLAN: "Premium",
}


def _month_bounds_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def is_premium(row: UserPreferences | None, now: datetime | None = None) -> bool:
    """Determine premium entitlement from live subscription state.

    Entitlement is driven by ``subscription_status`` (and ``current_period_end``
    when present), NOT by the cached ``plan`` column. This prevents a stale or
    out-of-sync ``plan`` from granting premium after a subscription has lapsed.

    Manual/comped accounts (``plan == premium`` set directly, with no Stripe
    subscription on file) remain premium.
    """
    if row is None:
        return False

    status = row.subscription_status
    if status in PREMIUM_SUBSCRIPTION_STATUSES:
        if row.current_period_end is not None:
            now = now or datetime.now(timezone.utc)
            period_end = row.current_period_end
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)
            if period_end < now:
                return False
        return True

    # Comped / manually-granted premium: plan set without a Stripe subscription.
    if row.plan == PREMIUM_PLAN and not row.stripe_subscription_id and status is None:
        return True

    return False


def get_user_plan(user_id: str, now: datetime | None = None) -> str:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    return PREMIUM_PLAN if is_premium(row, now=now) else BASIC_PLAN


def monthly_trade_limit(plan: str) -> int | None:
    if plan == BASIC_PLAN:
        return BASIC_MONTHLY_TRADE_LIMIT
    return None


def plan_price_usd(plan: str) -> float | None:
    if plan == BASIC_PLAN:
        return 0.0
    if plan == PREMIUM_PLAN:
        return 1.0
    return None


def count_trades_created_this_month(user_id: str, now: datetime | None = None) -> int:
    start, end = _month_bounds_utc(now)
    return (
        Trade.query.filter(
            Trade.user_id == user_id,
            Trade.created_at >= start,
            Trade.created_at < end,
        ).count()
    )


def trade_limit_snapshot(user_id: str, now: datetime | None = None) -> dict:
    plan = get_user_plan(user_id, now=now)
    limit = monthly_trade_limit(plan)
    used = count_trades_created_this_month(user_id, now=now)
    start, end = _month_bounds_utc(now)
    remaining = None if limit is None else max(0, limit - used)
    return {
        "plan": plan,
        "plan_label": PLAN_LABELS.get(plan, plan.title()),
        "price_usd": plan_price_usd(plan),
        "trades_this_month": used,
        "trades_limit": limit,
        "trades_remaining": remaining,
        "limit_reached": limit is not None and used >= limit,
        "period_start": start.date().isoformat(),
        "period_end": end.date().isoformat(),
    }


def trade_limit_error(user_id: str, now: datetime | None = None) -> str | None:
    snapshot = trade_limit_snapshot(user_id, now=now)
    if snapshot["limit_reached"]:
        limit = snapshot["trades_limit"]
        return (
            f"Monthly trade limit reached ({limit} trades on Basic plan). "
            "Upgrade to Premium or wait until next month."
        )
    return None
