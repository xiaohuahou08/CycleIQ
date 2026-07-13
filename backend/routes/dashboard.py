from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone

from flask import jsonify

from backend.auth.supabase import require_auth
from backend.models.trade import Trade
from backend.models.wheel_cycle import WheelCycle
from backend.services.csp_capital import capital_utilization_pct, get_capital_budget
from backend.services.capital_flows import capital_flow_events_for_user
from backend.services.capital_invested import (
    build_capital_trend_charts,
    compute_open_csp_capital,
    compute_total_capital_pool,
)
from backend.services.portfolio_returns import compute_time_weighted_return
from backend.services.realized_pnl import compute_realized_pnl


def register_dashboard_routes(dashboard_bp):
    def _premium_total(t: Trade) -> float:
        return float(t.premium) * int(t.contracts) * 100

    def _fees_total(t: Trade) -> float:
        commission = float(t.commission_fee) if t.commission_fee is not None else 0.0
        assignment_fees = (
            float(t.fees_on_assignment) if getattr(t, "fees_on_assignment", None) is not None else 0.0
        )
        return commission + assignment_fees

    def _realized_cashflow(t: Trade) -> float:
        # Net premium cashflow: premium collected − buyback paid (for ROLLED legs) − explicit fees.
        buyback_total = float(getattr(t, "buyback_cost_per_share", None) or 0) * int(t.contracts) * 100
        return _premium_total(t) - _fees_total(t) - buyback_total

    def _completion_date(t: Trade) -> date:
        if t.status == "EXPIRED" and t.expired_at is not None:
            return t.expired_at
        if t.status == "CLOSED" and t.closed_at is not None:
            return t.closed_at
        if t.status == "ASSIGNED" and t.assigned_at is not None:
            return t.assigned_at
        if t.status == "CALLED_AWAY" and t.called_away_at is not None:
            return t.called_away_at
        if t.status == "ROLLED" and t.rolled_at is not None:
            return t.rolled_at
        # Fallback for old records before lifecycle date fields existed.
        if t.expired_at is not None:
            return t.expired_at
        return t.expiry

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
        today = datetime.now(timezone.utc).date()
        # Active open legs only (matches Trades "Today" — expiry has not passed).
        open_trades = [
            t for t in trades if t.status == "OPEN" and t.expiry is not None and t.expiry >= today
        ]
        closed_trades = [t for t in trades if t.status != "OPEN"]

        total_premium = sum(_premium_total(t) for t in trades)

        # ── Per-ticker stock position analysis ──────────────────────────────
        # For each ticker that has an ASSIGNED PUT (stock held after CSP assignment):
        #  1. Compute effective cost basis = initial basis − realized CC premium reductions
        #     (EXPIRED and CLOSED/bought-back CCs reduce the holding cost permanently;
        #      ROLLED CCs are excluded — their net premium is captured when the new leg settles)
        #  2. Compute stock sale P&L for CALLED_AWAY CCs:
        #     gain = (callaway_strike − CSP assignment strike) × shares_called
        #     (premiums counted separately in option cashflows; do not use cost basis)
        # ─────────────────────────────────────────────────────────────────────
        by_ticker: dict[str, list] = defaultdict(list)
        for t in trades:
            by_ticker[t.ticker].append(t)

        # ticker → effective holding cost per share (initial basis − expired/closed CC reductions)
        ticker_effective_basis: dict[str, float] = {}
        # stock gain/loss realised when shares were called away via CC assignment
        extra_stock_sale_pnl = 0.0
        # aggregate CC premium credited to held stock positions (for KPI display)
        total_cc_basis_reduction = 0.0
        # current total effective cost of still-held stock positions
        total_stock_effective_cost = 0.0

        for ticker, tt in by_ticker.items():
            assigned_puts = [
                t for t in tt
                if t.option_type == "PUT"
                and t.status in ("ASSIGNED", "CALLED_AWAY")
                and t.stock_cost_basis_per_share is not None
            ]
            if not assigned_puts:
                continue

            assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
            if assigned_shares <= 0:
                continue

            weighted_initial_basis: float = (
                sum(
                    float(t.stock_cost_basis_per_share) * int(t.contracts) * 100
                    for t in assigned_puts
                )
                / assigned_shares
            )

            # OPEN (premium collected), EXPIRED, CLOSED, and ROLLED CC legs reduce stock cost basis.
            # CALLED_AWAY is excluded — those shares were sold, handled in stock_sale_pnl.
            basis_reducing_ccs = [
                t for t in tt
                if t.option_type == "CALL" and t.status in ("OPEN", "EXPIRED", "CLOSED", "ROLLED")
            ]
            cc_reduction_net = sum(_realized_cashflow(t) for t in basis_reducing_ccs)
            cc_reduction_per_share = cc_reduction_net / assigned_shares
            effective_basis_per_share = max(0.0, weighted_initial_basis - cc_reduction_per_share)
            ticker_effective_basis[ticker] = effective_basis_per_share

            # Stock sale P&L: shares bought at CSP strike, sold at CC strike.
            # Use assignment strike (not premium-reduced basis) so CSP premium is
            # not double-counted — premiums stay in option cashflows only.
            # Gain = (callaway_strike − CSP assignment strike) × shares_called
            called_away_ccs = [t for t in tt if t.option_type == "CALL" and t.status == "CALLED_AWAY"]
            called_away_shares = sum(int(t.contracts) * 100 for t in called_away_ccs)
            weighted_assignment_strike = (
                sum(float(t.strike) * int(t.contracts) * 100 for t in assigned_puts)
                / assigned_shares
            )
            for cc in called_away_ccs:
                shares_called = int(cc.contracts) * 100
                extra_stock_sale_pnl += (
                    float(cc.strike) - weighted_assignment_strike
                ) * shares_called

            remaining_shares = assigned_shares - called_away_shares
            if remaining_shares > 0:
                total_cc_basis_reduction += cc_reduction_net
                total_stock_effective_cost += effective_basis_per_share * remaining_shares

        # ── Capital invested ─────────────────────────────────────────────────
        # • Open CSP: cash-secured notional (new cash at risk).
        # • Stock held after assignment: counted once via total_stock_effective_cost.
        # • Open CC does NOT add capital — shares were already paid for at assignment;
        #   the CC is premium income on existing stock, not additional deployment.
        def _capital_at_risk(t: Trade) -> float:
            """Per-leg capital for closed-trade ROI (includes CC at stock basis when applicable)."""
            shares = int(t.contracts) * 100
            if t.option_type == "PUT":
                return float(t.strike) * shares
            eff_basis = ticker_effective_basis.get(t.ticker)
            if eff_basis is not None:
                return eff_basis * shares
            if getattr(t, "stock_cost_basis_per_share", None) is not None:
                return float(t.stock_cost_basis_per_share) * shares
            return float(t.strike) * shares

        open_csp_capital = compute_open_csp_capital(trades, today)
        total_capital_invested = open_csp_capital + total_stock_effective_cost
        capital_budget = get_capital_budget(user_id)
        realized_pnl = compute_realized_pnl(trades, today)
        total_capital = compute_total_capital_pool(capital_budget, trades, today)
        capital_utilization = capital_utilization_pct(total_capital_invested, total_capital)
        active_trades = len(open_trades)

        pnl_statuses = {"CLOSED", "EXPIRED", "ROLLED", "CALLED_AWAY", "ASSIGNED"}
        realized_trades = [t for t in closed_trades if t.status in pnl_statuses]

        # Win rate: terminal outcomes only (ROLLED is not terminal — a new leg follows it).
        # Win = expired worthless, called away at target, or closed at a net profit.
        terminal_statuses = {"CLOSED", "EXPIRED", "ASSIGNED", "CALLED_AWAY"}
        terminal_trades = [t for t in closed_trades if t.status in terminal_statuses]
        wins = [
            t for t in terminal_trades
            if t.status in ("EXPIRED", "CALLED_AWAY")
            or (t.status == "CLOSED" and _realized_cashflow(t) > 0)
        ]
        win_rate = (len(wins) / len(terminal_trades) * 100.0) if terminal_trades else 0.0

        if trades:
            first_trade_day = min(t.trade_date for t in trades if t.trade_date is not None)
            elapsed_days = _days_between(today, first_trade_day)
        else:
            elapsed_days = 1

        # Premium-weighted average DTE (days to expiry) for open legs, then
        # open premium / weighted DTE = implied $/day at that horizon (not calendar "active days").
        open_premium_total = sum(_premium_total(t) for t in open_trades)
        if open_trades and open_premium_total > 0:
            weighted_open_dte = (
                sum(
                    _premium_total(t) * _days_between(t.expiry, today) for t in open_trades
                )
                / open_premium_total
            )
            avg_premium_per_active_day = open_premium_total / weighted_open_dte
        else:
            weighted_open_dte = 0.0
            avg_premium_per_active_day = 0.0
        daily_avg = total_premium / elapsed_days
        yearly_income = daily_avg * 365

        if open_trades and total_capital_invested > 0:
            avg_open_dte = sum(_days_between(t.expiry, today) for t in open_trades) / len(open_trades)
            open_premium_annualized_yield = (
                (sum(_premium_total(t) for t in open_trades) / total_capital_invested)
                * (365 / max(1.0, avg_open_dte))
                * 100.0
            )
        else:
            open_premium_annualized_yield = 0.0

        closed_capital_invested = sum(_capital_at_risk(t) for t in realized_trades)
        if realized_trades and closed_capital_invested > 0:
            avg_closed_holding_days = (
                sum(_days_between(_completion_date(t), t.trade_date) for t in realized_trades)
                / len(realized_trades)
            )
            realized_annual_roi = (
                (realized_pnl / closed_capital_invested)
                * (365 / max(1.0, avg_closed_holding_days))
                * 100.0
            )
        else:
            realized_annual_roi = 0.0

        capital_flows = capital_flow_events_for_user(user_id)
        time_weighted_return_pct, cumulative_total_return_pct, twr_unreliable = (
            compute_time_weighted_return(trades, capital_flows, capital_budget, today)
        )

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

        capital_trend = build_capital_trend_charts(
            trades, capital_budget, today, flows=capital_flows
        )

        return jsonify(
            {
                "kpis": {
                    "total_capital": round(total_capital, 2),
                    "total_capital_invested": round(total_capital_invested, 2),
                    "capital_budget": round(capital_budget, 2),
                    "capital_utilization_pct": round(capital_utilization, 1),
                    "total_premium": round(total_premium, 2),
                    "realized_pnl": round(realized_pnl, 2),
                    # Keep legacy key for compatibility; equivalent to open premium annualized yield.
                    "avg_annual_roi": round(open_premium_annualized_yield, 1),
                    "open_premium_annualized_yield": round(open_premium_annualized_yield, 1),
                    "realized_annual_roi": round(realized_annual_roi, 1),
                    "time_weighted_return_pct": round(time_weighted_return_pct, 2),
                    "cumulative_total_return_pct": round(cumulative_total_return_pct, 2),
                    "time_weighted_return_unreliable": twr_unreliable,
                    "has_capital_flows": len(capital_flows) > 0,
                    "active_trades": active_trades,
                    "win_rate": round(win_rate, 1),
                    "avg_premium_per_active_day": round(avg_premium_per_active_day, 2),
                    "weighted_open_dte": round(weighted_open_dte, 2),
                    "yearly_income": round(yearly_income, 2),
                    "daily_avg_income": round(daily_avg, 2),
                    # ── Stock position metrics (wheel strategy) ──────────────
                    # Effective total cost of held stock after crediting expired/closed CC premiums
                    "total_stock_effective_cost": round(total_stock_effective_cost, 2),
                    # Total CC premium credited to reduce stock holding cost
                    "total_cc_basis_reduction": round(total_cc_basis_reduction, 2),
                    # P&L purely from stock sales (shares called away via CC assignment)
                    "stock_sale_pnl": round(extra_stock_sale_pnl, 2),
                },
                "charts": {
                    "daily_premium_income": _series(daily_bucket, 7),
                    "weekly_premium_income": _series(weekly_bucket, 6),
                    "monthly_premium_income": _series(monthly_bucket, 6),
                    "capital_trend": capital_trend,
                    "monthly_capital_invested": capital_trend["monthly"],
                },
            }
        )
