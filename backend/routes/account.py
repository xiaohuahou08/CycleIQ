from __future__ import annotations

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.trade import Trade
from backend.models.wheel_cycle import WheelCycle


def register_account_routes(account_bp):
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
