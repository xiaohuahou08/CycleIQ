from __future__ import annotations

from datetime import datetime, timezone

from backend.models.trade import Trade
from backend.models.user_preferences import UserPreferences

BASIC_PLAN = "basic"
PREMIUM_PLAN = "premium"
BASIC_MONTHLY_TRADE_LIMIT = 20

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


def get_user_plan(user_id: str) -> str:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if not row or row.plan != PREMIUM_PLAN:
        return BASIC_PLAN
    return PREMIUM_PLAN


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
    plan = get_user_plan(user_id)
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
