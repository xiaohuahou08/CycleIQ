from flask import jsonify
from sqlalchemy import func
from backend.models import db
from backend.models.trade import Trade


def register_dashboard_routes(dashboard_bp):
    @dashboard_bp.route("/summary", methods=["GET"])
    def summary():
        open_trades = Trade.query.filter(Trade.status == "open").all()
        closed_trades = Trade.query.filter(Trade.status == "closed").all()

        total_premium = sum(float(t.premium or 0) for t in open_trades + closed_trades)
        open_count = len(open_trades)
        closed_count = len(closed_trades)

        return jsonify({
            "total_trades": open_count + closed_count,
            "open_trades": open_count,
            "closed_trades": closed_count,
            "total_premium": round(total_premium, 2),
        })

    @dashboard_bp.route("/positions", methods=["GET"])
    def positions():
        open_trades = (
            Trade.query
            .filter(Trade.status == "open")
            .filter(Trade.position_type.in_(["STOCK", "PUT", "CALL"]))
            .order_by(Trade.ticker, Trade.created_at.desc())
            .all()
        )

        # Group by ticker
        positions = {}
        for t in open_trades:
            if t.ticker not in positions:
                positions[t.ticker] = {
                    "ticker": t.ticker,
                    "shares": 0,
                    "puts": [],
                    "calls": [],
                }
            entry = {
                "id": t.id,
                "strike": float(t.strike) if t.strike else None,
                "expiry": t.expiry.isoformat() if t.expiry else None,
                "premium": float(t.premium) if t.premium else None,
                "quantity": t.quantity,
                "assigned": t.assigned,
                "action": t.action,
                "status": t.status,
            }
            if t.position_type == "PUT":
                positions[t.ticker]["puts"].append(entry)
            elif t.position_type == "CALL":
                positions[t.ticker]["calls"].append(entry)
            elif t.position_type == "STOCK":
                positions[t.ticker]["shares"] += t.quantity * (100 if t.action == "BUY" else -100)

        return jsonify(list(positions.values()))

    @dashboard_bp.route("/cycles", methods=["GET"])
    def cycles_summary():
        # Return wheel cycle status per ticker
        tickers = db.session.query(Trade.ticker).filter(Trade.status == "open").distinct().all()
        result = []
        for (ticker,) in tickers:
            trades = Trade.query.filter(Trade.ticker == ticker, Trade.status == "open").all()
            has_stock = any(t.position_type == "STOCK" for t in trades)
            has_put = any(t.position_type == "PUT" for t in trades)
            has_call = any(t.position_type == "CALL" for t in trades)

            if has_stock and has_call:
                state = "CC_OPEN"
            elif has_stock:
                state = "STOCK_HELD"
            elif has_put:
                state = "CSP_OPEN"
            else:
                state = "IDLE"

            result.append({"ticker": ticker, "state": state})
        return jsonify(result)
