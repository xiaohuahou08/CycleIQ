from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import stripe
from flask import current_app

from backend.models import db
from backend.models.user_preferences import (
    BASIC_PLAN,
    PREMIUM_PLAN,
    UserPreferences,
)

PREMIUM_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing"})


def _configure_stripe() -> None:
    secret = (current_app.config.get("STRIPE_SECRET_KEY") or "").strip()
    if not secret:
        raise ValueError("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = secret


def _as_dict(obj: Any) -> dict[str, Any]:
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return dict(obj)


def _ensure_preferences(user_id: str) -> UserPreferences:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if not row:
        row = UserPreferences(user_id=user_id)
        db.session.add(row)
        db.session.flush()
    return row


def apply_plan_from_subscription_status(row: UserPreferences, status: str | None) -> None:
    if status in PREMIUM_SUBSCRIPTION_STATUSES:
        row.plan = PREMIUM_PLAN
    else:
        row.plan = BASIC_PLAN
    row.subscription_status = status
    row.updated_at = datetime.now(timezone.utc)


def _period_end_from_subscription(subscription: dict[str, Any]) -> datetime | None:
    raw = subscription.get("current_period_end")
    if raw is None:
        return None
    return datetime.fromtimestamp(int(raw), tz=timezone.utc)


def sync_user_from_subscription(user_id: str, subscription: dict[str, Any]) -> UserPreferences:
    row = _ensure_preferences(user_id)
    row.stripe_subscription_id = subscription.get("id")
    customer = subscription.get("customer")
    if customer:
        row.stripe_customer_id = str(customer)
    apply_plan_from_subscription_status(row, subscription.get("status"))
    row.current_period_end = _period_end_from_subscription(subscription)
    row.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return row


def get_or_create_stripe_customer(user_id: str, email: str | None) -> str:
    row = _ensure_preferences(user_id)
    if row.stripe_customer_id:
        return row.stripe_customer_id

    _configure_stripe()
    params: dict[str, Any] = {"metadata": {"user_id": user_id}}
    if email:
        params["email"] = email
    customer = stripe.Customer.create(**params)
    row.stripe_customer_id = customer.id
    row.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return customer.id


def create_checkout_session(user_id: str, email: str | None) -> str:
    price_id = (current_app.config.get("STRIPE_PRICE_PREMIUM_MONTHLY") or "").strip()
    if not price_id:
        raise ValueError("STRIPE_PRICE_PREMIUM_MONTHLY is not configured")

    frontend = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    customer_id = get_or_create_stripe_customer(user_id, email)

    _configure_stripe()
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        client_reference_id=user_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{frontend}/settings?billing=success",
        cancel_url=f"{frontend}/pricing?billing=canceled",
        metadata={"user_id": user_id},
        subscription_data={"metadata": {"user_id": user_id}},
    )
    if not session.url:
        raise ValueError("Stripe did not return a checkout URL")
    return session.url


def create_portal_session(user_id: str) -> str:
    row = _ensure_preferences(user_id)
    if not row.stripe_customer_id:
        raise ValueError("No Stripe customer on file. Upgrade to Premium first.")

    frontend = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    _configure_stripe()
    session = stripe.billing_portal.Session.create(
        customer=row.stripe_customer_id,
        return_url=f"{frontend}/settings",
    )
    if not session.url:
        raise ValueError("Stripe did not return a portal URL")
    return session.url


def billing_status_dict(user_id: str) -> dict[str, Any]:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if not row:
        return {
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "subscription_status": None,
            "current_period_end": None,
            "can_manage_billing": False,
        }
    period_end = row.current_period_end.isoformat().replace("+00:00", "Z") if row.current_period_end else None
    return {
        "stripe_customer_id": row.stripe_customer_id,
        "stripe_subscription_id": row.stripe_subscription_id,
        "subscription_status": row.subscription_status,
        "current_period_end": period_end,
        "can_manage_billing": bool(row.stripe_customer_id),
    }


def handle_stripe_event(event: Any) -> None:
    event_dict = _as_dict(event)
    event_type = event_dict.get("type")
    data_object = _as_dict((event_dict.get("data") or {}).get("object"))

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data_object)
    elif event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        _handle_subscription_event(data_object)


def _resolve_user_id(session_or_sub: dict[str, Any]) -> str | None:
    metadata = session_or_sub.get("metadata") or {}
    user_id = session_or_sub.get("client_reference_id") or metadata.get("user_id")
    if user_id:
        return str(user_id)
    customer_id = session_or_sub.get("customer")
    if not customer_id:
        return None
    row = UserPreferences.query.filter_by(stripe_customer_id=str(customer_id)).first()
    return row.user_id if row else None


def _handle_checkout_completed(session: dict[str, Any]) -> None:
    user_id = _resolve_user_id(session)
    if not user_id:
        return

    row = _ensure_preferences(user_id)
    if session.get("customer"):
        row.stripe_customer_id = str(session["customer"])
    subscription_id = session.get("subscription")
    if subscription_id:
        row.stripe_subscription_id = str(subscription_id)
        _configure_stripe()
        subscription = _as_dict(stripe.Subscription.retrieve(str(subscription_id)))
        apply_plan_from_subscription_status(row, subscription.get("status"))
        row.current_period_end = _period_end_from_subscription(subscription)
    row.updated_at = datetime.now(timezone.utc)
    db.session.commit()


def _handle_subscription_event(subscription: dict[str, Any]) -> None:
    user_id = _resolve_user_id(subscription)
    if not user_id:
        return
    sync_user_from_subscription(user_id, subscription)
