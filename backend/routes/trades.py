from datetime import datetime, timezone

from flask import request, jsonify
from backend.models import db
from backend.models.trade import Trade
from backend.auth.supabase import require_auth


def register_trades_routes(trades_bp):
    @trades_bp.route("", methods=["GET"])
    @require_auth
    def list_trades(user_id):
        status = request.args.get("status")
        ticker = request.args.get("ticker")
        q = Trade.query
        if status:
            q = q.filter(Trade.status == status)
        if ticker:
            q = q.filter(Trade.ticker == ticker.upper())
        trades = q.order_by(Trade.created_at.desc()).all()
        return jsonify([t.to_dict() for t in trades])

    @trades_bp.route("", methods=["POST"])
    @require_auth
    def create_trade(user_id):
        data = request.get_json() or {}
        required = ["ticker", "action", "position_type"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400

        trade = Trade(
            ticker=data["ticker"].upper(),
            action=data["action"].upper(),
            position_type=data["position_type"].upper(),
            strike=float(data["strike"]) if data.get("strike") else None,
            expiry=data.get("expiry"),
            premium=float(data["premium"]) if data.get("premium") else None,
            quantity=int(data.get("quantity", 1)),
            assigned=bool(data.get("assigned", False)),
            notes=data.get("notes"),
            user_id=user_id,
        )
        db.session.add(trade)
        db.session.commit()
        return jsonify(trade.to_dict()), 201

    @trades_bp.route("/<trade_id>", methods=["GET"])
    @require_auth
    def get_trade(user_id, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        return jsonify(trade.to_dict())

    @trades_bp.route("/<trade_id>", methods=["PUT", "PATCH"])
    @require_auth
    def update_trade(user_id, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        data = request.get_json() or {}

        for field in ["ticker", "action", "position_type", "status", "notes"]:
            if field in data:
                setattr(trade, field, data[field].upper() if field in ("action", "position_type") else data[field])

        for field in ["strike", "premium"]:
            if field in data:
                setattr(trade, field, float(data[field]))

        if "quantity" in data:
            trade.quantity = int(data["quantity"])
        if "assigned" in data:
            trade.assigned = bool(data["assigned"])
        if "expiry" in data:
            trade.expiry = data["expiry"]

        if data.get("status") == "closed" and trade.status != "closed":
            trade.status = "closed"
            trade.closed_at = datetime.now(timezone.utc)

        db.session.commit()
        return jsonify(trade.to_dict())

    @trades_bp.route("/<trade_id>", methods=["DELETE"])
    @require_auth
    def delete_trade(user_id, trade_id: str):
        trade = Trade.query.filter_by(id=trade_id, user_id=user_id).first_or_404()
        db.session.delete(trade)
        db.session.commit()
        return "", 204
