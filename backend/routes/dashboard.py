from __future__ import annotations

from datetime import date, datetime

from flask import jsonify

from backend.auth.supabase import require_auth
from backend.models.trade import Trade
from backend.models.wheel_cycle import WheelCycle


def register_dashboard_routes(dashboard_bp):
    def _premium_total(t: Trade) -> float:
        return float(t.premium) * int(t.contracts) * 100

    def _start_of_week_monday(d: date) -> date:
        return d.fromordinal(d.toordinal() - d.weekday())

    def _days_between(a: date, b: date) -> int:
        return max(1, abs((a - b).days))

    @dashboard_bp.route("/summary", methods=["GET"])
    @require_auth
    def summary(user_id: str):
        trades = Trade.query.filter_by(user_id=user_id).all()

        open_trades = [t for t in trades if t.status == "OPEN"]
        closed_trades = [t for t in trades if t.status != "OPEN"]
        total_premium = sum(_premium_total(t) for t in trades)

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

    @dashboard_bp.route("/insights", methods=["GET"])
    @require_auth
    def insights(user_id: str):
        trades = Trade.query.filter_by(user_id=user_id).all()
        open_trades = [t for t in trades if t.status == "OPEN"]
        closed_trades = [t for t in trades if t.status != "OPEN"]

        total_premium = sum(_premium_total(t) for t in trades)
        total_capital_invested = sum(float(t.strike) * int(t.contracts) * 100 for t in open_trades)
        realized_pnl = sum(_premium_total(t) for t in closed_trades)
        active_trades = len(open_trades)

        profitable_statuses = {"EXPIRED", "CLOSED", "ROLLED", "CALLED_AWAY"}
        profitable_count = len([t for t in closed_trades if t.status in profitable_statuses])
        win_rate = (profitable_count / len(closed_trades) * 100.0) if closed_trades else 0.0

        today = datetime.utcnow().date()
        if trades:
            first_trade_day = min(t.trade_date for t in trades if t.trade_date is not None)
            elapsed_days = _days_between(today, first_trade_day)
        else:
            elapsed_days = 1

        active_days = len({t.trade_date for t in open_trades})
        active_days = max(1, active_days)
        avg_premium_per_active_day = (
            sum(_premium_total(t) for t in open_trades) / active_days if open_trades else 0.0
        )
        daily_avg = total_premium / elapsed_days
        yearly_income = daily_avg * 365

        if open_trades and total_capital_invested > 0:
            avg_open_dte = sum(_days_between(t.expiry, today) for t in open_trades) / len(open_trades)
            annualized_return = (
                (sum(_premium_total(t) for t in open_trades) / total_capital_invested)
                * (365 / max(1.0, avg_open_dte))
                * 100.0
            )
        else:
            annualized_return = 0.0

        daily_bucket: dict[str, float] = {}
        weekly_bucket: dict[str, float] = {}
        monthly_bucket: dict[str, float] = {}
        for t in trades:
            premium = _premium_total(t)
            day_key = t.trade_date.isoformat()
            week_key = _start_of_week_monday(t.trade_date).isoformat()
            month_key = f"{t.trade_date.year:04d}-{t.trade_date.month:02d}"
            daily_bucket[day_key] = daily_bucket.get(day_key, 0.0) + premium
            weekly_bucket[week_key] = weekly_bucket.get(week_key, 0.0) + premium
            monthly_bucket[month_key] = monthly_bucket.get(month_key, 0.0) + premium

        def _series(bucket: dict[str, float], limit: int) -> list[dict]:
            keys = sorted(bucket.keys())[-limit:]
            return [{"label": k, "value": round(bucket[k], 2)} for k in keys]

        return jsonify(
            {
                "kpis": {
                    "total_capital_invested": round(total_capital_invested, 2),
                    "total_premium": round(total_premium, 2),
                    "realized_pnl": round(realized_pnl, 2),
                    "avg_annual_roi": round(annualized_return, 1),
                    "active_trades": active_trades,
                    "win_rate": round(win_rate, 1),
                    "avg_premium_per_active_day": round(avg_premium_per_active_day, 2),
                    "active_days": active_days,
                    "yearly_income": round(yearly_income, 2),
                    "daily_avg_income": round(daily_avg, 2),
                },
                "charts": {
                    "daily_premium_income": _series(daily_bucket, 7),
                    "weekly_premium_income": _series(weekly_bucket, 6),
                    "monthly_premium_income": _series(monthly_bucket, 6),
                },
            }
        )
