import importlib.util
import os
from datetime import date, timedelta
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
from backend.models.user_preferences import UserPreferences
from backend.models.wheel_cycle import WheelCycle


@pytest.fixture
def app():
    os.environ["SUPABASE_JWT_SECRET"] = "unit_test_jwt_secret"
    application = create_app(config_class=TestingConfig)
    application.config["SUPABASE_JWT_SECRET"] = os.environ["SUPABASE_JWT_SECRET"]
    # Forged HS256 tokens omit `iss`; disable issuer enforcement for tests.
    application.config["SUPABASE_URL"] = ""
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def auth_headers(user_id: str = "00000000-0000-0000-0000-000000000099") -> dict[str, str]:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "unit_test_jwt_secret")
    token = jwt.encode(
        {"sub": user_id, "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def future_expiry(months: int = 18) -> str:
    return (date.today() + timedelta(days=30 * months)).isoformat()


def set_capital_budget(client, headers, amount: float = 250_000) -> None:
    res = client.put(
        "/api/me/preferences",
        json={"total_capital_budget": amount},
        headers=headers,
    )
    assert res.status_code == 200


def set_user_plan(app, user_id: str, plan: str) -> None:
    with app.app_context():
        row = UserPreferences.query.filter_by(user_id=user_id).first()
        if not row:
            row = UserPreferences(user_id=user_id, plan=plan)
            db.session.add(row)
        else:
            row.plan = plan
        db.session.commit()


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
    assert r.get_json()["cycle_id"] is not None

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


def test_put_assigned_sets_stock_cost_basis_csp(client):
    """Premium is per share; commissions are total USD, spread across shares."""
    h = auth_headers("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    payload = {
        "ticker": "HIMS",
        "option_type": "PUT",
        "strike": 28,
        "expiry": "2026-06-15",
        "trade_date": "2026-04-01",
        "premium": 1.2,
        "commission_fee": 18.0,
        "contracts": 3,
        "status": "OPEN",
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    tid = created.get_json()["id"]

    assignment_price = 28.0
    fees_assignment = 5.0
    shares = 300
    expected = assignment_price - 1.2 + (18.0 + fees_assignment) / shares

    assign = client.put(
        f"/api/trades/{tid}",
        json={
            "status": "ASSIGNED",
            "trade_date": "2026-04-29",
            "strike": assignment_price,
            "fees_on_assignment": fees_assignment,
        },
        headers=h,
    )
    assert assign.status_code == 200
    body = assign.get_json()
    assert body["stock_cost_basis_per_share"] == pytest.approx(expected, abs=1e-4)


def test_put_called_away_clears_stock_cost_basis(client):
    h = auth_headers("cccccccc-cccc-cccc-cccc-cccccccccccc")
    put_payload = {
        "ticker": "HIMS",
        "option_type": "PUT",
        "strike": 28,
        "expiry": "2026-06-15",
        "trade_date": "2026-03-15",
        "premium": 1.2,
        "contracts": 1,
        "status": "OPEN",
    }
    put_created = client.post("/api/trades", json=put_payload, headers=h)
    assert put_created.status_code == 201
    put_id = put_created.get_json()["id"]
    cycle_id = put_created.get_json()["cycle_id"]

    assign = client.put(
        f"/api/trades/{put_id}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-01", "strike": 28},
        headers=h,
    )
    assert assign.status_code == 200

    payload = {
        "ticker": "HIMS",
        "option_type": "CALL",
        "strike": 30,
        "expiry": "2026-06-15",
        "trade_date": "2026-04-01",
        "premium": 1.5,
        "contracts": 1,
        "status": "OPEN",
        "cycle_id": cycle_id,
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    tid = created.get_json()["id"]

    out = client.put(
        f"/api/trades/{tid}",
        json={
            "status": "CALLED_AWAY",
            "trade_date": "2026-04-29",
            "strike": 30,
        },
        headers=h,
    )
    assert out.status_code == 200
    assert out.get_json()["stock_cost_basis_per_share"] is None


def test_trade_auto_attaches_existing_cycle(client):
    h = auth_headers("66666666-6666-6666-6666-666666666666")
    cycle = client.post("/api/cycles", json={"ticker": "UNH"}, headers=h)
    assert cycle.status_code == 201
    cycle_id = cycle.get_json()["id"]

    payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 360,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 3.25,
        "contracts": 1,
        "status": "OPEN",
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    assert created.get_json()["cycle_id"] == cycle_id

    cycle_after = client.get(f"/api/cycles/{cycle_id}", headers=h)
    assert cycle_after.status_code == 200
    assert cycle_after.get_json()["state"] == "CSP_OPEN"


def test_trade_creates_new_cycle_when_latest_ticker_cycle_is_active_put(client):
    h = auth_headers("88888888-8888-8888-8888-888888888888")
    first_payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 50,
        "expiry": future_expiry(),
        "trade_date": "2026-04-01",
        "premium": 3.25,
        "contracts": 1,
        "status": "OPEN",
    }
    first = client.post("/api/trades", json=first_payload, headers=h)
    assert first.status_code == 201
    first_cycle_id = first.get_json()["cycle_id"]
    assert first_cycle_id is not None

    second_payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 45,
        "expiry": future_expiry(19),
        "trade_date": "2026-04-03",
        "premium": 2.75,
        "contracts": 1,
        "status": "OPEN",
    }
    second = client.post("/api/trades", json=second_payload, headers=h)
    assert second.status_code == 201
    assert second.get_json()["cycle_id"] != first_cycle_id


def test_trade_auto_creates_cycle_if_existing_is_exit(client, app):
    h = auth_headers("77777777-7777-7777-7777-777777777777")
    with app.app_context():
        exited = WheelCycle(
            user_id="77777777-7777-7777-7777-777777777777",
            ticker="UNH",
            state="EXIT",
            transition_log="[]",
        )
        db.session.add(exited)
        db.session.commit()
        exited_id = exited.id

    payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 360,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 3.25,
        "contracts": 1,
        "status": "OPEN",
    }
    created = client.post("/api/trades", json=payload, headers=h)
    assert created.status_code == 201
    assert created.get_json()["cycle_id"] != exited_id


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


def test_dashboard_insights_api(client, monkeypatch):
    monkeypatch.setattr(
        "backend.routes.dashboard.fetch_yahoo_prices",
        lambda tickers: {},
    )
    h = auth_headers("33333333-3333-3333-3333-333333333333")
    set_capital_budget(client, h, 100_000)
    trades = [
        {
            "ticker": "UNH",
            "option_type": "PUT",
            "strike": 360,
            "expiry": "2027-05-07",
            "trade_date": "2026-04-27",
            "premium": 1.2,
            "contracts": 2,
            "status": "OPEN",
        },
        {
            "ticker": "HIMS",
            "option_type": "PUT",
            "strike": 28,
            "expiry": "2027-05-07",
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
    assert body["kpis"]["capital_budget"] == pytest.approx(100_000)
    assert body["kpis"]["capital_utilization_pct"] == pytest.approx(71.6, abs=0.5)
    assert body["kpis"]["total_capital"] == pytest.approx(100_450.0)
    assert body["kpis"]["total_premium"] == pytest.approx(690.0)
    assert body["kpis"]["realized_pnl"] == pytest.approx(450.0)
    assert isinstance(body["charts"]["daily_premium_income"], list)
    assert isinstance(body["charts"]["capital_trend"], dict)
    assert isinstance(body["charts"]["capital_trend"]["weekly"], list)
    assert isinstance(body["charts"]["capital_trend"]["monthly"], list)
    assert len(body["charts"]["capital_trend"]["monthly"]) >= 1
    # budget 100k + realized 450
    assert body["charts"]["capital_trend"]["monthly"][-1]["value"] == pytest.approx(100_450.0)
    assert body["charts"]["capital_trend"]["monthly"][-1]["date"] is not None
    assert "time_weighted_return_pct" in body["kpis"]
    assert "cumulative_total_return_pct" in body["kpis"]
    assert "time_weighted_return_unreliable" in body["kpis"]
    assert body["kpis"]["has_capital_flows"] is False


def test_dashboard_insights_twr_with_capital_flow(client):
    h = auth_headers("44444444-4444-4444-4444-444444444444")
    set_capital_budget(client, h, 100_000)
    client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 1000, "event_date": "2026-01-15"},
        headers=h,
    )
    body = client.get("/api/dashboard/insights", headers=h).get_json()
    assert body["kpis"]["has_capital_flows"] is True
    assert body["kpis"]["capital_budget"] == pytest.approx(101_000)


def test_capital_trend_reflects_past_deposit(client):
    h = auth_headers("66666666-6666-6666-6666-666666666666")
    set_capital_budget(client, h, 100_000)
    deposit_date = f"{date.today().year}-02-01"
    client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 25_000, "event_date": deposit_date},
        headers=h,
    )
    body = client.get("/api/dashboard/insights", headers=h).get_json()
    monthly = {p["label"]: p["value"] for p in body["charts"]["capital_trend"]["monthly"]}
    feb_label = f"{date.today().year}-02"
    jan_label = f"{date.today().year}-01"
    if feb_label in monthly and jan_label in monthly:
        assert monthly[feb_label] - monthly[jan_label] == pytest.approx(25_000, abs=1)


def test_dashboard_insights_includes_assigned_csp_premium(client, monkeypatch):
    """ASSIGNED CSP premium counts toward realized P&L (matches Cycles wheel)."""
    monkeypatch.setattr(
        "backend.routes.dashboard.fetch_yahoo_prices",
        lambda tickers: {},
    )
    h = auth_headers("55555555-5555-5555-5555-555555555555")
    created = client.post(
        "/api/trades",
        json={
            "ticker": "AAPL",
            "option_type": "PUT",
            "strike": 180,
            "expiry": "2026-06-20",
            "trade_date": "2026-04-01",
            "premium": 2.0,
            "contracts": 1,
            "status": "OPEN",
        },
        headers=h,
    )
    assert created.status_code == 201
    tid = created.get_json()["id"]
    assign = client.put(
        f"/api/trades/{tid}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-29"},
        headers=h,
    )
    assert assign.status_code == 200

    body = client.get("/api/dashboard/insights", headers=h).get_json()
    # premium 2.0 × 1 contract × 100
    assert body["kpis"]["realized_pnl"] == pytest.approx(200.0)
    assert body["kpis"]["unrealized_stock_mtm"] == pytest.approx(0.0)
    assert body["kpis"]["total_pnl"] == pytest.approx(200.0)


def test_dashboard_insights_includes_assigned_stock_mtm(client, monkeypatch):
    """Open assigned shares mark to market in total capital / net P&L."""
    monkeypatch.setattr(
        "backend.routes.dashboard.fetch_yahoo_prices",
        lambda tickers: {"AAPL": 185.0},
    )
    h = auth_headers("77777777-7777-7777-7777-777777777777")
    set_capital_budget(client, h, 100_000)
    created = client.post(
        "/api/trades",
        json={
            "ticker": "AAPL",
            "option_type": "PUT",
            "strike": 180,
            "expiry": "2026-06-20",
            "trade_date": "2026-04-01",
            "premium": 2.0,
            "contracts": 1,
            "status": "OPEN",
        },
        headers=h,
    )
    assert created.status_code == 201
    tid = created.get_json()["id"]
    assert client.put(
        f"/api/trades/{tid}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-29"},
        headers=h,
    ).status_code == 200

    body = client.get("/api/dashboard/insights", headers=h).get_json()
    # realized premium 200 + MTM (185−180)×100 = 500 → total_pnl 700
    assert body["kpis"]["realized_pnl"] == pytest.approx(200.0)
    assert body["kpis"]["unrealized_stock_mtm"] == pytest.approx(500.0)
    assert body["kpis"]["total_pnl"] == pytest.approx(700.0)
    assert body["kpis"]["total_capital"] == pytest.approx(100_700.0)
    assert body["charts"]["capital_trend"]["monthly"][-1]["value"] == pytest.approx(100_700.0)


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


def test_call_away_cc_updates_assigned_put_and_cycle_exit(client):
    """Marking a CC CALLED_AWAY cascades to the assigned PUT and sets cycle EXIT."""
    h = auth_headers("dddddddd-dddd-dddd-dddd-dddddddddddd")

    put_payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 390,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    put_created = client.post("/api/trades", json=put_payload, headers=h)
    assert put_created.status_code == 201
    put_body = put_created.get_json()
    put_id = put_body["id"]
    cycle_id = put_body["cycle_id"]
    assert cycle_id is not None

    assign = client.put(
        f"/api/trades/{put_id}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-29"},
        headers=h,
    )
    assert assign.status_code == 200
    basis = assign.get_json()["stock_cost_basis_per_share"]
    assert basis is not None

    cc_payload = {
        "ticker": "UNH",
        "option_type": "CALL",
        "strike": 400,
        "expiry": "2026-07-18",
        "trade_date": "2026-05-01",
        "premium": 3.0,
        "contracts": 1,
        "status": "OPEN",
        "cycle_id": cycle_id,
    }
    cc_created = client.post("/api/trades", json=cc_payload, headers=h)
    assert cc_created.status_code == 201
    cc_id = cc_created.get_json()["id"]

    called = client.put(
        f"/api/trades/{cc_id}",
        json={
            "status": "CALLED_AWAY",
            "trade_date": "2026-05-15",
            "called_away_at": "2026-05-15",
        },
        headers=h,
    )
    assert called.status_code == 200

    trades = client.get("/api/trades", headers=h).get_json()["trades"]
    put_after = next(t for t in trades if t["id"] == put_id)
    assert put_after["status"] == "CALLED_AWAY"
    assert put_after["stock_cost_basis_per_share"] == pytest.approx(basis, abs=1e-4)

    cycle = client.get(f"/api/cycles/{cycle_id}", headers=h).get_json()
    assert cycle["state"] == "EXIT"


def test_dashboard_expired_cc_reduces_stock_effective_cost(client, monkeypatch):
    """Expired CC premium lowers total_stock_effective_cost for held stock."""
    monkeypatch.setattr(
        "backend.routes.dashboard.fetch_yahoo_prices",
        lambda tickers: {},
    )
    h = auth_headers("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

    put_payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 390,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    put_created = client.post("/api/trades", json=put_payload, headers=h)
    assert put_created.status_code == 201
    put_id = put_created.get_json()["id"]
    cycle_id = put_created.get_json()["cycle_id"]

    assign = client.put(
        f"/api/trades/{put_id}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-29"},
        headers=h,
    )
    assert assign.status_code == 200
    basis = assign.get_json()["stock_cost_basis_per_share"]

    cc_payload = {
        "ticker": "UNH",
        "option_type": "CALL",
        "strike": 400,
        "expiry": "2026-07-18",
        "trade_date": "2026-05-01",
        "premium": 2.0,
        "contracts": 1,
        "status": "EXPIRED",
        "cycle_id": cycle_id,
    }
    cc_created = client.post("/api/trades", json=cc_payload, headers=h)
    assert cc_created.status_code == 201

    kpis = client.get("/api/dashboard/insights", headers=h).get_json()["kpis"]
    cc_reduction = 2.0 * 100
    expected_cost = (basis - cc_reduction / 100) * 100
    assert kpis["total_cc_basis_reduction"] == pytest.approx(cc_reduction, abs=0.01)
    assert kpis["total_stock_effective_cost"] == pytest.approx(expected_cost, abs=0.01)


def test_create_open_cc_rejects_without_assigned_stock(client):
    h = auth_headers("cccccccc-cccc-cccc-cccc-cccccccccccc")
    payload = {
        "ticker": "AAPL",
        "option_type": "CALL",
        "strike": 160,
        "expiry": "2027-01-15",
        "trade_date": "2026-06-20",
        "premium": 1.5,
        "contracts": 1,
        "status": "OPEN",
    }
    r = client.post("/api/trades", json=payload, headers=h)
    assert r.status_code == 400
    assert "assigned stock" in r.get_json().get("error", "").lower()


def test_create_open_cc_rejects_when_contracts_exceed_shares(client):
    h = auth_headers("dddddddd-dddd-dddd-dddd-dddddddddddd")
    put_payload = {
        "ticker": "UNH",
        "option_type": "PUT",
        "strike": 390,
        "expiry": "2026-06-20",
        "trade_date": "2026-04-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    put_created = client.post("/api/trades", json=put_payload, headers=h)
    assert put_created.status_code == 201
    put_id = put_created.get_json()["id"]
    cycle_id = put_created.get_json()["cycle_id"]

    assign = client.put(
        f"/api/trades/{put_id}",
        json={"status": "ASSIGNED", "trade_date": "2026-04-29"},
        headers=h,
    )
    assert assign.status_code == 200

    cc_payload = {
        "ticker": "UNH",
        "option_type": "CALL",
        "strike": 400,
        "expiry": "2026-07-18",
        "trade_date": "2026-05-01",
        "premium": 3.0,
        "contracts": 2,
        "status": "OPEN",
        "cycle_id": cycle_id,
    }
    r = client.post("/api/trades", json=cc_payload, headers=h)
    assert r.status_code == 400
    assert "not enough" in r.get_json().get("error", "").lower()


def test_get_preferences_returns_defaults_when_missing(client):
    h = auth_headers("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    res = client.get("/api/me/preferences", headers=h)
    assert res.status_code == 200
    body = res.get_json()
    assert body["commission_per_contract"] is None
    assert body["default_contracts"] == 1
    assert body["default_dte"] == 45
    assert body["total_capital_budget"] == pytest.approx(10000)


def test_create_open_csp_rejects_when_over_capital_budget(client):
    h = auth_headers("dddddddd-dddd-dddd-dddd-dddddddddddd")
    payload = {
        "ticker": "AAPL",
        "option_type": "PUT",
        "strike": 150,
        "expiry": "2026-12-19",
        "trade_date": "2026-06-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    r = client.post("/api/trades", json=payload, headers=h)
    assert r.status_code == 400
    assert "available capital" in r.get_json().get("error", "").lower()


def test_create_open_csp_allowed_within_budget(client):
    h = auth_headers("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    payload = {
        "ticker": "AAPL",
        "option_type": "PUT",
        "strike": 50,
        "expiry": "2026-12-19",
        "trade_date": "2026-06-01",
        "premium": 1.0,
        "contracts": 1,
        "status": "OPEN",
    }
    r = client.post("/api/trades", json=payload, headers=h)
    assert r.status_code == 201


def test_put_preferences_persists_capital_budget(client):
    h = auth_headers("ffffffff-ffff-ffff-ffff-ffffffffffff")
    put = client.put(
        "/api/me/preferences",
        json={"total_capital_budget": 25000},
        headers=h,
    )
    assert put.status_code == 200
    assert put.get_json()["total_capital_budget"] == pytest.approx(25000)


def test_put_and_get_preferences_persist_per_user(client):
    h1 = auth_headers("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    h2 = auth_headers("cccccccc-cccc-cccc-cccc-cccccccccccc")

    put = client.put(
        "/api/me/preferences",
        json={
            "commission_per_contract": 0.65,
            "default_contracts": 2,
            "default_dte": 30,
        },
        headers=h1,
    )
    assert put.status_code == 200
    assert put.get_json()["default_contracts"] == 2

    get1 = client.get("/api/me/preferences", headers=h1)
    assert get1.status_code == 200
    assert get1.get_json()["commission_per_contract"] == pytest.approx(0.65)
    assert get1.get_json()["default_dte"] == 30

    get2 = client.get("/api/me/preferences", headers=h2)
    assert get2.get_json()["default_contracts"] == 1

    with client.application.app_context():
        assert UserPreferences.query.filter_by(user_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb").count() == 1


def test_put_preferences_rejects_invalid_values(client):
    h = auth_headers()
    res = client.put(
        "/api/me/preferences",
        json={"default_contracts": 0, "default_dte": 45},
        headers=h,
    )
    assert res.status_code == 400


def test_post_capital_flow_deposit(client):
    h = auth_headers()
    res = client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 5000, "event_date": "2026-04-01"},
        headers=h,
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["type"] == "deposit"
    assert body["amount"] == pytest.approx(5000)

    prefs = client.get("/api/me/preferences", headers=h).get_json()
    assert prefs["total_capital_budget"] == pytest.approx(15000)


def test_post_capital_flow_withdrawal(client):
    h = auth_headers()
    set_capital_budget(client, h, 20_000)
    res = client.post(
        "/api/me/capital-flows",
        json={"type": "withdrawal", "amount": 3000, "event_date": date.today().isoformat()},
        headers=h,
    )
    assert res.status_code == 201
    assert res.get_json()["amount"] == pytest.approx(-3000)
    prefs = client.get("/api/me/preferences", headers=h).get_json()
    assert prefs["total_capital_budget"] == pytest.approx(17_000)


def test_delete_capital_flow_reverses_budget(client):
    h = auth_headers()
    created = client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 1000, "event_date": "2026-05-01"},
        headers=h,
    ).get_json()
    deleted = client.delete(f"/api/me/capital-flows/{created['id']}", headers=h)
    assert deleted.status_code == 200
    prefs = client.get("/api/me/preferences", headers=h).get_json()
    assert prefs["total_capital_budget"] == pytest.approx(10000)


def test_preferences_budget_editable_when_flows_exist(client):
    h = auth_headers()
    client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 1000, "event_date": "2026-05-01"},
        headers=h,
    )
    res = client.put(
        "/api/me/preferences",
        json={"total_capital_budget": 50_000, "default_contracts": 1, "default_dte": 45},
        headers=h,
    )
    assert res.status_code == 200
    assert res.get_json()["total_capital_budget"] == pytest.approx(50_000)


def test_put_capital_flow_update(client):
    h = auth_headers()
    set_capital_budget(client, h, 100_000)
    created = client.post(
        "/api/me/capital-flows",
        json={"type": "deposit", "amount": 5000, "event_date": "2026-03-01"},
        headers=h,
    ).get_json()
    updated = client.put(
        f"/api/me/capital-flows/{created['id']}",
        json={"type": "deposit", "amount": 8000, "event_date": "2026-03-15"},
        headers=h,
    )
    assert updated.status_code == 200
    assert updated.get_json()["amount"] == pytest.approx(8000)
    prefs = client.get("/api/me/preferences", headers=h).get_json()
    assert prefs["total_capital_budget"] == pytest.approx(108_000)


def test_production_app_init_registers_preferences():
    init_path = Path(__file__).resolve().parents[1] / "backend" / "app" / "__init__.py"
    text = init_path.read_text(encoding="utf-8")
    assert "register_preferences_routes(preferences_bp)" in text
    assert "app.register_blueprint(preferences_bp)" in text
    assert "register_account_routes(account_bp)" in text
    assert "app.register_blueprint(account_bp)" in text


def test_reset_trading_data_deletes_only_calling_user(client):
    h1 = auth_headers("11111111-1111-1111-1111-111111111111")
    h2 = auth_headers("22222222-2222-2222-2222-222222222222")

    for h in (h1, h2):
        r = client.post(
            "/api/trades",
            json={
                "ticker": "AAPL",
                "option_type": "PUT",
                "strike": 50,
                "expiry": "2027-06-20",
                "trade_date": "2026-04-01",
                "premium": 1.0,
                "contracts": 1,
                "status": "OPEN",
            },
            headers=h,
        )
        assert r.status_code == 201

    assert client.get("/api/trades", headers=h1).get_json()["total"] == 1
    assert client.get("/api/trades", headers=h2).get_json()["total"] == 1
    assert client.get("/api/cycles", headers=h1).get_json() != []

    bad = client.post("/api/me/reset-trading-data", json={}, headers=h1)
    assert bad.status_code == 400

    reset = client.post("/api/me/reset-trading-data", json={"confirm": True}, headers=h1)
    assert reset.status_code == 200
    body = reset.get_json()
    assert body["trades_deleted"] == 1
    assert body["cycles_deleted"] >= 1

    assert client.get("/api/trades", headers=h1).get_json()["total"] == 0
    assert client.get("/api/cycles", headers=h1).get_json()["total"] == 0
    assert client.get("/api/trades", headers=h2).get_json()["total"] == 1

    prefs = client.put(
        "/api/me/preferences",
        json={"default_contracts": 3},
        headers=h1,
    )
    assert prefs.status_code == 200
    assert prefs.get_json()["default_contracts"] == 3


def test_plan_usage_endpoint(client):
    h = auth_headers()
    set_capital_budget(client, h)
    r = client.get("/api/me/plan", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["plan"] == "basic"
    assert body["plan_label"] == "Basic"
    assert body["trades_limit"] == 20
    assert body["trades_this_month"] == 0
    assert body["limit_reached"] is False
    assert body["trades_remaining"] == 20
    assert body["price_usd"] == 0


def test_monthly_trade_limit_enforced(client):
    from backend.services.trade_limits import BASIC_MONTHLY_TRADE_LIMIT

    h = auth_headers()
    set_capital_budget(client, h, 500_000)
    payload = {
        "ticker": "AAPL",
        "option_type": "PUT",
        "strike": 150,
        "expiry": future_expiry(),
        "trade_date": "2026-04-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    for _ in range(BASIC_MONTHLY_TRADE_LIMIT):
        r = client.post("/api/trades", json=payload, headers=h)
        assert r.status_code == 201, r.get_json()

    over = client.post("/api/trades", json=payload, headers=h)
    assert over.status_code == 403
    assert "Basic plan" in over.get_json()["error"]

    plan = client.get("/api/me/plan", headers=h)
    assert plan.get_json()["trades_this_month"] == BASIC_MONTHLY_TRADE_LIMIT
    assert plan.get_json()["limit_reached"] is True
    assert plan.get_json()["trades_remaining"] == 0


def test_premium_plan_has_unlimited_trades(client, app):
    from backend.services.trade_limits import BASIC_MONTHLY_TRADE_LIMIT

    user_id = "00000000-0000-0000-0000-000000000099"
    h = auth_headers(user_id)
    set_capital_budget(client, h, 2_000_000)
    set_user_plan(app, user_id, "premium")

    plan = client.get("/api/me/plan", headers=h)
    body = plan.get_json()
    assert body["plan"] == "premium"
    assert body["plan_label"] == "Premium"
    assert body["trades_limit"] is None
    assert body["limit_reached"] is False
    assert body["price_usd"] == 1.0

    payload = {
        "ticker": "AAPL",
        "option_type": "PUT",
        "strike": 150,
        "expiry": future_expiry(),
        "trade_date": "2026-04-01",
        "premium": 2.5,
        "contracts": 1,
        "status": "OPEN",
    }
    for _ in range(BASIC_MONTHLY_TRADE_LIMIT + 1):
        r = client.post("/api/trades", json=payload, headers=h)
        assert r.status_code == 201, r.get_json()
