from __future__ import annotations

from flask import jsonify

from backend.auth.supabase import require_auth
from backend.models.trade import Trade
from backend.models.wheel_cycle import WheelCycle


def register_dashboard_routes(dashboard_bp):
    @dashboard_bp.route("/summary", methods=["GET"])
    @require_auth
    def summary(user_id: str):
        trades = Trade.query.filter_by(user_id=user_id).all()

        def premium_total(t: Trade) -> float:
            return float(t.premium) * int(t.contracts) * 100

        open_trades = [t for t in trades if t.status == "OPEN"]
        closed_trades = [t for t in trades if t.status != "OPEN"]
        total_premium = sum(premium_total(t) for t in trades)

        return jsonify(
            {
                "total_trades": len(trades),
                "open_trades": len(open_trades),
                "closed_trades": len(closed_trades),
                "total_premium": round(total_premium, 2),
            }
        )

    @dashboard_bp.route("/positions", methods=["GET"])
    @require_auth
    def positions(user_id: str):
        open_trades = (
            Trade.query.filter_by(user_id=user_id, status="OPEN")
            .order_by(Trade.ticker, Trade.created_at.desc())
            .all()
        )

        grouped: dict[str, dict] = {}
        for t in open_trades:
            if t.ticker not in grouped:
                grouped[t.ticker] = {
                    "ticker": t.ticker,
                    "shares": 0,
                    "puts": [],
                    "calls": [],
                }
            entry = {
                "id": t.id,
                "strike": float(t.strike),
                "expiry": t.expiry.isoformat(),
                "premium": float(t.premium),
                "contracts": t.contracts,
                "option_type": t.option_type,
                "status": t.status,
            }
            if t.option_type == "PUT":
                grouped[t.ticker]["puts"].append(entry)
            elif t.option_type == "CALL":
                grouped[t.ticker]["calls"].append(entry)

        return jsonify(list(grouped.values()))

    @dashboard_bp.route("/cycles", methods=["GET"])
    @require_auth
    def cycles_summary(user_id: str):
        rows = WheelCycle.query.filter_by(user_id=user_id).all()
        return jsonify([{"id": r.id, "ticker": r.ticker, "state": r.state} for r in rows])
