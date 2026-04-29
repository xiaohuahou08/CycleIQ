import importlib.util
import os
from pathlib import Path

import jwt
import pytest

pytest.importorskip("flask_cors")

_root = Path(__file__).resolve().parents[1]
_app_path = _root / "backend" / "app.py"
_spec = importlib.util.spec_from_file_location("cycleiq_backend_app_module", _app_path)
assert _spec and _spec.loader
_app_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_app_mod)
create_app = _app_mod.create_app

from backend.config import TestingConfig
from backend.models import db


@pytest.fixture
def app():
    os.environ["SUPABASE_JWT_SECRET"] = "unit_test_jwt_secret"
    application = create_app(config_class=TestingConfig)
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def auth_headers(user_id: str = "00000000-0000-0000-0000-000000000099") -> dict[str, str]:
    token = jwt.encode({"sub": user_id}, "unit_test_jwt_secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_create_cycle_and_transition(client):
    h = auth_headers()
    r = client.post("/api/cycles", json={"ticker": "aapl"}, headers=h)
    assert r.status_code == 201
    cid = r.get_json()["id"]

    r2 = client.post(
        f"/api/cycles/{cid}/transitions",
        json={
            "event": "sell_csp",
            "params": {"strike": 150, "expiry": "2026-05-16", "premium": 2.5},
        },
        headers=h,
    )
    assert r2.status_code == 200
    body = r2.get_json()
    assert body["to_state"] == "CSP_OPEN"

    r3 = client.get(f"/api/cycles/{cid}/state", headers=h)
    assert r3.status_code == 200
    assert r3.get_json()["state"] == "CSP_OPEN"


def test_trade_crud_and_user_scope(client):
    h = auth_headers("11111111-1111-1111-1111-111111111111")
    h2 = auth_headers("22222222-2222-2222-2222-222222222222")

    payload = {
        "ticker": "MSFT",
        "option_type": "PUT",
        "strike": 300,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 3.25,
        "commission_fee": 0.19,
        "contracts": 1,
        "status": "OPEN",
    }
    r = client.post("/api/trades", json=payload, headers=h)
    assert r.status_code == 201
    tid = r.get_json()["id"]
    assert r.get_json()["commission_fee"] == pytest.approx(0.19)

    r_list = client.get("/api/trades", headers=h)
    assert r_list.status_code == 200
    data = r_list.get_json()
    assert data["total"] == 1
    assert len(data["trades"]) == 1

    r_other = client.get("/api/trades", headers=h2)
    assert r_other.get_json()["total"] == 0

    r_patch = client.patch(f"/api/trades/{tid}/status", json={"status": "CLOSED"}, headers=h)
    assert r_patch.status_code == 200
    assert r_patch.get_json()["status"] == "CLOSED"

    r_del = client.delete(f"/api/trades/{tid}", headers=h)
    assert r_del.status_code == 204


def test_invalid_trade_status(client):
    h = auth_headers()
    r = client.post(
        "/api/trades",
        json={
            "ticker": "X",
            "option_type": "PUT",
            "strike": 1,
            "expiry": "2026-06-20",
            "trade_date": "2026-04-01",
            "premium": 1,
            "status": "NOT_A_STATUS",
        },
        headers=h,
    )
    assert r.status_code == 400


def test_dashboard_insights_api(client):
    h = auth_headers("33333333-3333-3333-3333-333333333333")
    trades = [
        {
            "ticker": "UNH",
            "option_type": "PUT",
            "strike": 360,
            "expiry": "2026-05-07",
            "trade_date": "2026-04-27",
            "premium": 1.2,
            "contracts": 2,
            "status": "OPEN",
        },
        {
            "ticker": "HIMS",
            "option_type": "PUT",
            "strike": 28,
            "expiry": "2026-05-07",
            "trade_date": "2026-04-28",
            "premium": 1.5,
            "contracts": 3,
            "status": "CLOSED",
        },
    ]
    for payload in trades:
        r = client.post("/api/trades", json=payload, headers=h)
        assert r.status_code == 201

    r_insights = client.get("/api/dashboard/insights", headers=h)
    assert r_insights.status_code == 200
    body = r_insights.get_json()

    assert "kpis" in body
    assert "charts" in body
    assert body["kpis"]["active_trades"] == 1
    assert body["kpis"]["total_premium"] == pytest.approx(690.0)
    assert body["kpis"]["realized_pnl"] == pytest.approx(450.0)
    assert isinstance(body["charts"]["daily_premium_income"], list)


def test_expire_trade_endpoint_sets_metadata(client):
    h = auth_headers("44444444-4444-4444-4444-444444444444")

    payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 360,
        "expiry": "2026-05-08",
        "trade_date": "2026-04-29",
        "premium": 1.0,
        "contracts": 1,
        "status": "OPEN",
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    tid = created.get_json()["id"]

    expired = client.patch(
        f"/api/trades/{tid}/expire",
        json={"expired_at": "2026-05-08", "expire_type": "expired_worthless"},
        headers=h,
    )
    assert expired.status_code == 200
    body = expired.get_json()
    assert body["status"] == "EXPIRED"
    assert body["expired_at"] == "2026-05-08"
    assert body["expire_type"] == "EXPIRED_WORTHLESS"


def test_expire_trade_requires_open_status(client):
    h = auth_headers("55555555-5555-5555-5555-555555555555")
    payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 360,
        "expiry": "2026-05-08",
        "trade_date": "2026-04-29",
        "premium": 1.0,
        "contracts": 1,
        "status": "CLOSED",
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    tid = created.get_json()["id"]

    expired = client.patch(
        f"/api/trades/{tid}/expire",
        json={"expired_at": "2026-05-08", "expire_type": "expired_worthless"},
        headers=h,
    )
    assert expired.status_code == 400
