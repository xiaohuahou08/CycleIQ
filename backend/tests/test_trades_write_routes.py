from __future__ import annotations

import uuid
from datetime import date, timedelta

import jwt

from backend.app import create_app
from backend.app.database import db


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SUPABASE_JWT_SECRET = "test-secret"


def _auth_header(user_id: uuid.UUID) -> dict[str, str]:
    token = jwt.encode(
        {"sub": str(user_id), "aud": "authenticated"},
        TestConfig.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_trades_post_and_put_are_routable():
    app = create_app(TestConfig)
    user_id = uuid.uuid4()
    trade_date = date.today()
    expiry = trade_date + timedelta(days=21)

    with app.app_context():
        db.create_all()

    try:
        with app.test_client() as client:
            create_payload = {
                "ticker": "AAPL",
                "option_type": "PUT",
                "action": "SELL",
                "strike": 200,
                "expiry": expiry.isoformat(),
                "trade_date": trade_date.isoformat(),
                "premium": 2.35,
                "contracts": 1,
                "event": "OPEN_CSP",
                "notes": "create route regression test",
            }
            create_resp = client.post(
                "/api/trades",
                json=create_payload,
                headers=_auth_header(user_id),
            )
            assert create_resp.status_code == 201
            created = create_resp.get_json()
            assert created["ticker"] == "AAPL"
            assert created["option_type"] == "PUT"
            assert created["premium_per_contract"] == 2.35
            trade_id = created["id"]

            update_payload = {
                "action": "BUY",
                "event": "CLOSE_CSP",
                "premium": 1.10,
                "notes": "updated from regression test",
            }
            update_resp = client.put(
                f"/api/trades/{trade_id}",
                json=update_payload,
                headers=_auth_header(user_id),
            )
            assert update_resp.status_code == 200
            updated = update_resp.get_json()
            assert updated["id"] == trade_id
            assert updated["action"] == "BUY"
            assert updated["event"] == "CLOSE_CSP"
            assert updated["premium_per_contract"] == 1.10
            assert updated["notes"] == "updated from regression test"
    finally:
        with app.app_context():
            db.session.remove()
            db.drop_all()
