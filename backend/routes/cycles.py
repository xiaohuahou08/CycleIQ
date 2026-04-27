from datetime import date, datetime, timezone
from decimal import Decimal
from flask import request, jsonify

from cycleiq.wheel_fsm import (
    Cycle, CycleEvent, CycleState, CycleMetrics,
    OptionLeg, StockLeg, OptionType, OptionAction, StockAction,
)
from backend.auth.supabase import require_auth


def register_cycles_routes(cycles_bp):
    @cycles_bp.route("/<ticker>/event", methods=["POST"])
    @require_auth
    def apply_event(user_id, ticker: str):
        data = request.get_json() or {}
        event_str = data.get("event")
        option_legs = data.get("option_legs", [])
        stock_leg = data.get("stock_leg")

        try:
            event = CycleEvent(event_str)
        except ValueError:
            return jsonify({"error": f"Unknown event: {event_str}"}), 400

        legs = [
            OptionLeg(
                type=OptionType(l["type"]),
                action=OptionAction(l["action"]),
                strike=Decimal(str(l["strike"])),
                expiry=date.fromisoformat(l["expiry"]),
                premium=Decimal(str(l["premium"])),
                quantity=l.get("quantity", 1),
                assigned=l.get("assigned", False),
            )
            for l in option_legs
        ]

        stock = None
        if stock_leg:
            stock = StockLeg(
                action=StockAction(stock_leg["action"]),
                price=Decimal(str(stock_leg["price"])),
                quantity=stock_leg.get("quantity", 100),
            )

        cycle = Cycle(ticker=ticker.upper())
        transition = cycle.apply_event(event, legs, stock)
        return jsonify({
            "from_state": transition.from_state.value,
            "to_state": transition.to_state.value,
            "event": transition.event.value,
            "timestamp": transition.timestamp.isoformat(),
        })

    @cycles_bp.route("/<ticker>/metrics", methods=["GET"])
    @require_auth
    def get_metrics(user_id, ticker: str):
        # In a full implementation this would load the cycle from DB.
        # For now return empty metrics structure.
        return jsonify({
            "ticker": ticker.upper(),
            "state": "IDLE",
            "total_premium_collected": 0.0,
            "stock_pnl": 0.0,
            "total_cycle_pnl": 0.0,
            "days_in_cycle": 0,
            "annualized_return": 0.0,
            "win_rate": 0.0,
            "roll_count": 0,
        })
