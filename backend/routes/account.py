from __future__ import annotations

from datetime import date

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.trade import Trade
from backend.models.wheel_cycle import WheelCycle
from backend.services.capital_flows import (
    add_capital_flow,
    delete_capital_flow,
    list_capital_flows,
    update_capital_flow,
)
from backend.services.trade_limits import trade_limit_snapshot


def _parse_event_date(raw) -> date:
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        raise ValueError("event_date is required")
    if isinstance(raw, date):
        return raw
    return date.fromisoformat(str(raw).strip())


def register_account_routes(account_bp):
    @account_bp.route("/plan", methods=["GET"])
    @require_auth
    def get_plan(user_id: str):
        return jsonify(trade_limit_snapshot(user_id))

    @account_bp.route("/capital-flows", methods=["GET"])
    @require_auth
    def get_capital_flows(user_id: str):
        flows = list_capital_flows(user_id)
        return jsonify({"flows": [f.to_api_dict() for f in flows]})

    @account_bp.route("/capital-flows", methods=["POST"])
    @require_auth
    def post_capital_flow(user_id: str):
        data = request.get_json() or {}
        try:
            event_date = _parse_event_date(data.get("event_date"))
            amount = float(data.get("amount"))
            flow_type = str(data.get("type", "")).strip().lower()
            flow = add_capital_flow(
                user_id,
                event_date=event_date,
                amount=amount,
                flow_type=flow_type,
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(flow.to_api_dict()), 201

    @account_bp.route("/capital-flows/<flow_id>", methods=["PUT"])
    @require_auth
    def put_capital_flow(user_id: str, flow_id: str):
        data = request.get_json() or {}
        try:
            event_date = _parse_event_date(data.get("event_date"))
            amount = float(data.get("amount"))
            flow_type = str(data.get("type", "")).strip().lower()
            flow = update_capital_flow(
                user_id,
                flow_id,
                event_date=event_date,
                amount=amount,
                flow_type=flow_type,
            )
        except LookupError:
            return jsonify({"error": "capital flow not found"}), 404
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(flow.to_api_dict())

    @account_bp.route("/capital-flows/<flow_id>", methods=["DELETE"])
    @require_auth
    def remove_capital_flow(user_id: str, flow_id: str):
        try:
            delete_capital_flow(user_id, flow_id)
        except LookupError:
            return jsonify({"error": "capital flow not found"}), 404
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"ok": True})

    @account_bp.route("/reset-trading-data", methods=["POST"])
    @require_auth
    def reset_trading_data(user_id: str):
        data = request.get_json(silent=True) or {}
        if data.get("confirm") is not True:
            return jsonify({"error": 'Request body must include {"confirm": true}'}), 400

        # Break roll chains before bulk delete (self-referential FK).
        Trade.query.filter_by(user_id=user_id).update({Trade.rolled_from_id: None})
        trades_deleted = Trade.query.filter_by(user_id=user_id).delete()
        cycles_deleted = WheelCycle.query.filter_by(user_id=user_id).delete()
        db.session.commit()

        return jsonify(
            {
                "trades_deleted": int(trades_deleted),
                "cycles_deleted": int(cycles_deleted),
            }
        )
