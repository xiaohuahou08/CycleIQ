from __future__ import annotations

from datetime import date, datetime, timezone

from flask import request, jsonify

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.trade import ALLOWED_EXPIRE_TYPES, ALLOWED_TRADE_STATUSES, Trade
from backend.models.wheel_cycle import WheelCycle


def register_trades_routes(trades_bp):
    @trades_bp.route("", methods=["GET"])
    @require_auth
    def list_trades(user_id: str):
        status = request.args.get("status")
        ticker = request.args.get("ticker")
        cycle_id = request.args.get("cycle_id")

        q = Trade.query.filter_by(user_id=user_id)
        if status:
            q = q.filter(Trade.status == status.upper())
        if ticker:
            q = q.filter(Trade.ticker == ticker.strip().upper())
        if cycle_id:
            q = q.filter(Trade.cycle_id == cycle_id)

        trades = q.order_by(Trade.created_at.desc()).all()
        body = {"trades": [t.to_api_dict() for t in trades], "total": len(trades)}
        return jsonify(body)

    @trades_bp.route("", methods=["POST"])
    @require_auth
    def create_trade(user_id: str):
        data = request.get_json() or {}
        required = ["ticker", "option_type", "strike", "expiry", "trade_date", "premium"]
        for field in required:
            if data.get(field) is None or (isinstance(data.get(field), str) and not str(data.get(field)).strip()):
                return jsonify({"error": f"Missing required field: {field}"}), 400

        cycle_id = data.get("cycle_id")
        if cycle_id:
            exists = WheelCycle.query.filter_by(id=cycle_id, user_id=user_id).first()
            if not exists:
                return jsonify({"error": "cycle_id not found"}), 400

        try:
            expiry = date.fromisoformat(str(data["expiry"]))
            trade_date = date.fromisoformat(str(data["trade_date"]))
        except ValueError:
            return jsonify({"error": "Invalid date format; use YYYY-MM-DD"}), 400

        option_type = str(data["option_type"]).upper()
        if option_type not in ("PUT", "CALL"):
            return jsonify({"error": "option_type must be PUT or CALL"}), 400

        status = str(data.get("status", "OPEN")).upper()
        if status not in ALLOWED_TRADE_STATUSES:
            return jsonify({"error": f"Invalid status; allowed: {sorted(ALLOWED_TRADE_STATUSES)}"}), 400

        trade = Trade(
            user_id=user_id,
            cycle_id=cycle_id,
            ticker=str(data["ticker"]).strip().upper(),
            option_type=option_type,
            strike=float(data["strike"]),
            expiry=expiry,
            trade_date=trade_date,
            premium=float(data["premium"]),
            commission_fee=float(data["commission_fee"])
            if data.get("commission_fee") is not None
            else None,
            delta=float(data["delta"]) if data.get("delta") is not None else None,
            contracts=int(data.get("contracts", 1)),
            status=status,
            notes=data.get("notes"),
        )
        db.session.add(trade)
        db.session.commit()
        return jsonify(trade.to_api_dict()), 201

    @trades_bp.route("/<trade_id>", methods=["GET"])
    @require_auth
    def get_trade(user_id: str, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        return jsonify(trade.to_api_dict())

    @trades_bp.route("/<trade_id>", methods=["PUT"])
    @require_auth
    def update_trade(user_id: str, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        data = request.get_json() or {}

        if "ticker" in data and data["ticker"]:
            trade.ticker = str(data["ticker"]).strip().upper()
        if "option_type" in data:
            ot = str(data["option_type"]).upper()
            if ot not in ("PUT", "CALL"):
                return jsonify({"error": "option_type must be PUT or CALL"}), 400
            trade.option_type = ot
        if "strike" in data:
            trade.strike = float(data["strike"])
        if "premium" in data:
            trade.premium = float(data["premium"])
        if "commission_fee" in data:
            trade.commission_fee = (
                float(data["commission_fee"]) if data["commission_fee"] is not None else None
            )
        if "contracts" in data:
            trade.contracts = int(data["contracts"])
        if "delta" in data:
            trade.delta = float(data["delta"]) if data["delta"] is not None else None
        if "notes" in data:
            trade.notes = data["notes"]
        if "cycle_id" in data:
            cid = data["cycle_id"]
            if cid is None:
                trade.cycle_id = None
            else:
                exists = WheelCycle.query.filter_by(id=cid, user_id=user_id).first()
                if not exists:
                    return jsonify({"error": "cycle_id not found"}), 400
                trade.cycle_id = cid

        if "expiry" in data and data["expiry"]:
            try:
                trade.expiry = date.fromisoformat(str(data["expiry"]))
            except ValueError:
                return jsonify({"error": "Invalid expiry"}), 400
        if "trade_date" in data and data["trade_date"]:
            try:
                trade.trade_date = date.fromisoformat(str(data["trade_date"]))
            except ValueError:
                return jsonify({"error": "Invalid trade_date"}), 400

        if "status" in data and data["status"] is not None:
            st = str(data["status"]).upper()
            if st not in ALLOWED_TRADE_STATUSES:
                return jsonify({"error": f"Invalid status; allowed: {sorted(ALLOWED_TRADE_STATUSES)}"}), 400
            trade.status = st
            if st != "EXPIRED":
                trade.expired_at = None
                trade.expire_type = None

        trade.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify(trade.to_api_dict())

    @trades_bp.route("/<trade_id>/expire", methods=["PATCH"])
    @require_auth
    def expire_trade(user_id: str, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        data = request.get_json() or {}

        if trade.status != "OPEN":
            return jsonify({"error": "Only OPEN trades can be marked as expired"}), 400

        try:
            expired_at = date.fromisoformat(str(data.get("expired_at") or date.today().isoformat()))
        except ValueError:
            return jsonify({"error": "Invalid expired_at date format; use YYYY-MM-DD"}), 400

        expire_type_raw = data.get("expire_type", "expired_worthless")
        expire_type = str(expire_type_raw).upper()
        if expire_type not in ALLOWED_EXPIRE_TYPES:
            return jsonify(
                {"error": f"Invalid expire_type; allowed: {sorted(ALLOWED_EXPIRE_TYPES)}"}
            ), 400

        if trade.expiry > expired_at:
            return jsonify({"error": "Trade cannot be expired before its expiry date"}), 400

        trade.status = "EXPIRED"
        trade.expired_at = expired_at
        trade.expire_type = expire_type
        trade.updated_at = datetime.now(timezone.utc)

        if trade.cycle_id:
            cycle = WheelCycle.query.filter_by(id=trade.cycle_id, user_id=user_id).first()
            if cycle:
                from backend.services.cycle_fsm import append_transition, apply_api_event, replay_cycle
                from cycleiq.wheel_fsm import InvalidTransitionError

                try:
                    fsm_cycle = replay_cycle(cycle.ticker, cycle.transition_log)
                    transition = apply_api_event(fsm_cycle, "expire_otm", {})
                    cycle.transition_log = append_transition(cycle.transition_log, transition)
                    cycle.state = fsm_cycle.state.value
                except (InvalidTransitionError, ValueError, KeyError, TypeError):
                    # Keep trade expiry update even if cycle transition is not applicable.
                    pass

        db.session.commit()
        return jsonify(trade.to_api_dict())

    @trades_bp.route("/<trade_id>/status", methods=["PATCH"])
    @require_auth
    def patch_trade_status(user_id: str, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        data = request.get_json() or {}
        if "status" not in data:
            return jsonify({"error": "status is required"}), 400
        st = str(data["status"]).upper()
        if st not in ALLOWED_TRADE_STATUSES:
            return jsonify({"error": f"Invalid status; allowed: {sorted(ALLOWED_TRADE_STATUSES)}"}), 400
        trade.status = st
        trade.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify(trade.to_api_dict())

    @trades_bp.route("/<trade_id>", methods=["DELETE"])
    @require_auth
    def delete_trade(user_id: str, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        db.session.delete(trade)
        db.session.commit()
        return "", 204
