from __future__ import annotations

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.wheel_cycle import WheelCycle
from backend.services.cycle_fsm import (
    append_transition,
    apply_api_event,
    metrics_to_response,
    replay_cycle,
    state_payload,
)
from cycleiq.wheel_fsm import InvalidTransitionError


ACTIVE_STATES = frozenset({"CSP_OPEN", "STOCK_HELD", "CC_OPEN"})


def register_cycles_routes(cycles_bp):
    @cycles_bp.route("", methods=["POST"])
    @require_auth
    def create_cycle(user_id: str):
        data = request.get_json() or {}
        ticker = (data.get("ticker") or "").strip().upper()
        if not ticker:
            return jsonify({"error": "ticker is required"}), 400

        row = WheelCycle(user_id=user_id, ticker=ticker, state="IDLE", transition_log="[]")
        db.session.add(row)
        db.session.commit()
        return jsonify(row.to_dict()), 201

    @cycles_bp.route("", methods=["GET"])
    @require_auth
    def list_cycles(user_id: str):
        status = request.args.get("status")
        q = WheelCycle.query.filter_by(user_id=user_id)
        if status == "active":
            q = q.filter(WheelCycle.state.in_(ACTIVE_STATES))
        rows = q.order_by(WheelCycle.created_at.desc()).all()
        return jsonify({"cycles": [r.to_dict() for r in rows], "total": len(rows)})

    @cycles_bp.route("/<cycle_id>", methods=["GET"])
    @require_auth
    def get_cycle(user_id: str, cycle_id: str):
        row = WheelCycle.query.filter_by(id=cycle_id, user_id=user_id).first_or_404()
        return jsonify(row.to_dict())

    @cycles_bp.route("/<cycle_id>/state", methods=["GET"])
    @require_auth
    def get_cycle_state(user_id: str, cycle_id: str):
        row = WheelCycle.query.filter_by(id=cycle_id, user_id=user_id).first_or_404()
        try:
            cycle = replay_cycle(row.ticker, row.transition_log)
        except (ValueError, KeyError, TypeError) as e:
            return jsonify({"error": f"Corrupt transition log: {e}"}), 500
        payload = state_payload(cycle)
        payload["cycle_id"] = row.id
        payload["ticker"] = row.ticker
        return jsonify(payload)

    @cycles_bp.route("/<cycle_id>/transitions", methods=["POST"])
    @require_auth
    def post_transition(user_id: str, cycle_id: str):
        row = WheelCycle.query.filter_by(id=cycle_id, user_id=user_id).first_or_404()
        data = request.get_json() or {}
        event_name = data.get("event")
        params = data.get("params") or {}
        if not event_name or not isinstance(event_name, str):
            return jsonify({"error": "event is required"}), 400

        try:
            cycle = replay_cycle(row.ticker, row.transition_log)
            transition = apply_api_event(cycle, event_name.strip().lower(), params)
            row.transition_log = append_transition(row.transition_log, transition)
            row.state = cycle.state.value
            db.session.commit()
        except InvalidTransitionError as e:
            return jsonify({"error": str(e)}), 400
        except (ValueError, KeyError, TypeError) as e:
            return jsonify({"error": str(e)}), 400

        return jsonify(
            {
                "from_state": transition.from_state.value,
                "to_state": transition.to_state.value,
                "event": transition.event.value,
                "timestamp": transition.timestamp.isoformat(),
            }
        )

    @cycles_bp.route("/<cycle_id>/metrics", methods=["GET"])
    @require_auth
    def get_cycle_metrics(user_id: str, cycle_id: str):
        row = WheelCycle.query.filter_by(id=cycle_id, user_id=user_id).first_or_404()
        try:
            cycle = replay_cycle(row.ticker, row.transition_log)
            m = cycle.metrics()
        except (ValueError, KeyError, TypeError) as e:
            return jsonify({"error": f"Corrupt transition log: {e}"}), 500

        out = metrics_to_response(m)
        out["ticker"] = row.ticker
        out["state"] = cycle.state.value
        return jsonify(out)
