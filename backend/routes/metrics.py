from __future__ import annotations

from flask import jsonify

from backend.auth.supabase import require_auth
from backend.models.trade import Trade


def register_metrics_routes(metrics_bp):
    @metrics_bp.route("/summary", methods=["GET"])
    @require_auth
    def summary(user_id: str):
        trades = Trade.query.filter_by(user_id=user_id).all()
        if not trades:
            return jsonify(
                {
                    "total_premium": 0.0,
                    "annualized_return": 0.0,
                    "active_positions": 0,
                    "win_rate": 0.0,
                }
            )

        def premium_total(t: Trade) -> float:
            return float(t.premium) * int(t.contracts) * 100

        total_premium = sum(premium_total(t) for t in trades)
        active = [t for t in trades if t.status == "OPEN"]
        closed = [t for t in trades if t.status != "OPEN"]
        wins = [t for t in closed if t.status in ("EXPIRED", "CALLED_AWAY", "CLOSED")]

        win_rate = (len(wins) / len(closed) * 100.0) if closed else 0.0
        annualized = 0.0
        if active:
            annualized = round(min(50.0, max(0.0, total_premium / max(len(active), 1) / 100.0 * 12)), 1)

        return jsonify(
            {
                "total_premium": round(total_premium, 2),
                "annualized_return": annualized,
                "active_positions": len(active),
                "win_rate": round(win_rate, 1),
            }
        )
