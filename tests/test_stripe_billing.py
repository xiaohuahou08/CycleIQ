import importlib.util
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import jwt
import pytest

pytest.importorskip("stripe")

_root = Path(__file__).resolve().parents[1]
_app_path = _root / "backend" / "app.py"
_spec = importlib.util.spec_from_file_location("cycleiq_backend_app_module", _app_path)
assert _spec and _spec.loader
_app_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_app_mod)
create_app = _app_mod.create_app

from backend.config import TestingConfig
from backend.models import db
from backend.models.user_preferences import UserPreferences
from backend.services.trade_limits import BASIC_PLAN, PREMIUM_PLAN


@pytest.fixture
def app():
    os.environ["SUPABASE_JWT_SECRET"] = "unit_test_jwt_secret"
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
    os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_fake"
    os.environ["STRIPE_PRICE_PREMIUM_MONTHLY"] = "price_test_premium"
    os.environ["FRONTEND_URL"] = "http://localhost:3000"
    application = create_app(config_class=TestingConfig)
    application.config.update(
        SUPABASE_JWT_SECRET=os.environ["SUPABASE_JWT_SECRET"],
        STRIPE_SECRET_KEY=os.environ["STRIPE_SECRET_KEY"],
        STRIPE_WEBHOOK_SECRET=os.environ["STRIPE_WEBHOOK_SECRET"],
        STRIPE_PRICE_PREMIUM_MONTHLY=os.environ["STRIPE_PRICE_PREMIUM_MONTHLY"],
        FRONTEND_URL=os.environ["FRONTEND_URL"],
    )
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def auth_headers(user_id: str = "00000000-0000-0000-0000-000000000099") -> dict[str, str]:
    token = jwt.encode(
        {"sub": user_id, "aud": "authenticated", "email": "test@example.com"},
        os.environ["SUPABASE_JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_checkout_session_requires_stripe_config(client, app):
    app.config["STRIPE_PRICE_PREMIUM_MONTHLY"] = ""
    r = client.post("/api/billing/checkout-session", headers=auth_headers())
    assert r.status_code == 503


@patch("backend.services.stripe_billing.stripe.checkout.Session.create")
@patch("backend.services.stripe_billing.stripe.Customer.create")
def test_checkout_session_returns_url(mock_customer, mock_session, client):
    mock_customer.return_value = MagicMock(id="cus_test")
    mock_session.return_value = MagicMock(url="https://checkout.stripe.com/test")

    r = client.post("/api/billing/checkout-session", headers=auth_headers())
    assert r.status_code == 200
    assert r.get_json()["url"] == "https://checkout.stripe.com/test"
    mock_session.assert_called_once()
    call_kwargs = mock_session.call_args.kwargs
    assert call_kwargs["mode"] == "subscription"
    assert call_kwargs["success_url"] == "http://localhost:3000/settings?billing=success&session_id={CHECKOUT_SESSION_ID}"
    assert call_kwargs["cancel_url"] == "http://localhost:3000/pricing?billing=canceled"


@patch("backend.services.stripe_billing.stripe.Webhook.construct_event")
def test_webhook_checkout_completed_sets_premium(mock_construct, client, app):
    user_id = "00000000-0000-0000-0000-000000000099"
    event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "customer": "cus_test",
                "subscription": "sub_test",
                "metadata": {"user_id": user_id},
            }
        },
    }
    mock_construct.return_value = event

    with patch("backend.services.stripe_billing.stripe.Subscription.retrieve") as mock_sub:
        mock_sub.return_value = {
            "id": "sub_test",
            "customer": "cus_test",
            "status": "active",
            "current_period_end": 1782513782,
        }
        r = client.post(
            "/webhooks/stripe",
            data=b"{}",
            headers={"Stripe-Signature": "test"},
        )

    assert r.status_code == 200
    with app.app_context():
        row = UserPreferences.query.filter_by(user_id=user_id).first()
        assert row is not None
        assert row.plan == PREMIUM_PLAN
        assert row.subscription_status == "active"


@patch("backend.services.stripe_billing.stripe.Subscription.list")
def test_sync_endpoint_upgrades_from_stripe(mock_list, client, app):
    user_id = "00000000-0000-0000-0000-000000000099"
    with app.app_context():
        row = UserPreferences(user_id=user_id, stripe_customer_id="cus_test")
        db.session.add(row)
        db.session.commit()

    mock_list.return_value = MagicMock(
        data=[
            {
                "id": "sub_test",
                "customer": "cus_test",
                "status": "active",
                "current_period_end": 1782513782,
            }
        ]
    )

    r = client.post("/api/billing/sync", headers=auth_headers(user_id))

    assert r.status_code == 200
    body = r.get_json()
    assert body["plan"] == PREMIUM_PLAN


@patch("backend.services.stripe_billing.stripe.Subscription.retrieve")
@patch("backend.services.stripe_billing.stripe.checkout.Session.retrieve")
def test_sync_endpoint_uses_checkout_session_id(mock_session, mock_sub, client, app):
    user_id = "00000000-0000-0000-0000-000000000099"
    mock_session.return_value = {
        "client_reference_id": user_id,
        "customer": "cus_test",
        "subscription": "sub_test",
        "metadata": {"user_id": user_id},
    }
    mock_sub.return_value = {
        "id": "sub_test",
        "customer": "cus_test",
        "status": "active",
        "current_period_end": 1782513782,
    }

    r = client.post(
        "/api/billing/sync",
        headers=auth_headers(user_id),
        json={"session_id": "cs_test_123"},
    )

    assert r.status_code == 200
    assert r.get_json()["plan"] == PREMIUM_PLAN
    mock_session.assert_called_once_with("cs_test_123")


@patch("backend.services.stripe_billing.stripe.Webhook.construct_event")
def test_webhook_subscription_deleted_downgrades(mock_construct, client, app):
    user_id = "00000000-0000-0000-0000-000000000088"
    with app.app_context():
        row = UserPreferences(
            user_id=user_id,
            plan=PREMIUM_PLAN,
            stripe_customer_id="cus_x",
            stripe_subscription_id="sub_x",
            subscription_status="active",
        )
        db.session.add(row)
        db.session.commit()

    mock_construct.return_value = {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_x",
                "customer": "cus_x",
                "status": "canceled",
                "metadata": {"user_id": user_id},
            }
        },
    }
    r = client.post("/webhooks/stripe", data=b"{}", headers={"Stripe-Signature": "t"})
    assert r.status_code == 200
    with app.app_context():
        row = UserPreferences.query.filter_by(user_id=user_id).first()
        assert row.plan == BASIC_PLAN
