"""WheelCycle routes – CRUD and FSM event application."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from flask import Blueprint, g, jsonify, request

from cycleiq.wheel_fsm import (
    Cycle as FsmCycle,
    CycleEvent,
    CycleState,
    InvalidTransitionError,
    OptionAction,
    OptionLeg,
    OptionType,
    StockAction,
    StockLeg,
)

from ..auth import require_auth
from ..database import db
from ..models import Trade, WheelCycle

cycles_bp = Blueprint("cycles", __name__, url_prefix="/api/cycles")


@cycles_bp.get("")
@require_auth
def list_cycles():
    cycles = (
        WheelCycle.query.filter_by(user_id=g.user_id)
        .order_by(WheelCycle.created_at.desc())
        .all()
    )
    return jsonify([c.to_dict() for c in cycles])


@cycles_bp.post("")
@require_auth
def create_cycle():
    data = request.get_json() or {}
    ticker = (data.get("ticker") or "").strip().upper()
    if not ticker:
        return jsonify({"error": "ticker is required"}), 400
    cycle = WheelCycle(user_id=g.user_id, ticker=ticker)
    db.session.add(cycle)
    db.session.commit()
    return jsonify(cycle.to_dict()), 201


@cycles_bp.get("/<uuid:cycle_id>")
@require_auth
def get_cycle(cycle_id):
    cycle = WheelCycle.query.filter_by(id=cycle_id, user_id=g.user_id).first_or_404()
    result = cycle.to_dict()
    result["trades"] = [t.to_dict() for t in cycle.trades]
    return jsonify(result)


@cycles_bp.delete("/<uuid:cycle_id>")
@require_auth
def delete_cycle(cycle_id):
    cycle = WheelCycle.query.filter_by(id=cycle_id, user_id=g.user_id).first_or_404()
    db.session.delete(cycle)
    db.session.commit()
    return "", 204


@cycles_bp.post("/<uuid:cycle_id>/event")
@require_auth
def apply_event(cycle_id):
    cycle = WheelCycle.query.filter_by(id=cycle_id, user_id=g.user_id).first_or_404()
    data = request.get_json() or {}

    event_str = data.get("event")
    try:
        event = CycleEvent(event_str)
    except (ValueError, TypeError):
        return jsonify({"error": f"Unknown event: {event_str}"}), 400

    # Validate transition using the FSM's allowed-transitions table.
    current_state = CycleState(cycle.state)
    new_state = FsmCycle._ALLOWED_TRANSITIONS.get((current_state, event))
    if new_state is None:
        return jsonify(
            {"error": f"Invalid transition: {cycle.state} + {event_str}"}
        ), 422

    # Parse option legs.
    option_legs: list[OptionLeg] = [
        OptionLeg(
            type=OptionType(leg["type"]),
            action=OptionAction(leg["action"]),
            strike=Decimal(str(leg["strike"])),
            expiry=date.fromisoformat(leg["expiry"]),
            premium=Decimal(str(leg["premium"])),
            quantity=int(leg.get("quantity", 1)),
        )
        for leg in data.get("option_legs", [])
    ]

    # Parse optional stock leg.
    stock_leg: StockLeg | None = None
    if sl := data.get("stock_leg"):
        stock_leg = StockLeg(
            action=StockAction(sl["action"]),
            price=Decimal(str(sl["price"])),
            quantity=int(sl.get("quantity", 100)),
        )

    # Validate payload structure via FSM static validator.
    try:
        FsmCycle._validate_event_payload(event, tuple(option_legs), stock_leg)
    except ValueError:
        return jsonify({"error": f"Invalid payload for event {event_str}"}), 422

    trade_date = date.fromisoformat(
        data.get("trade_date") or date.today().isoformat()
    )
    notes = data.get("notes")

    # Persist one Trade row per leg.
    for leg in option_legs:
        db.session.add(
            Trade(
                wheel_cycle_id=cycle.id,
                option_type=leg.type.value,
                action=leg.action.value,
                strike=leg.strike,
                expiration_date=leg.expiry,
                contracts=leg.quantity,
                premium_per_contract=leg.premium,
                event=event.value,
                trade_date=trade_date,
                notes=notes,
            )
        )

    if stock_leg:
        db.session.add(
            Trade(
                wheel_cycle_id=cycle.id,
                option_type=None,
                action=stock_leg.action.value,
                stock_price=stock_leg.price,
                contracts=stock_leg.quantity,
                event=event.value,
                trade_date=trade_date,
                notes=notes,
            )
        )

    # Update premium total (sells add, buys subtract).
    premium_delta = sum(
        (leg.premium if leg.action == OptionAction.SELL else -leg.premium) * leg.quantity
        for leg in option_legs
    )

    old_state = cycle.state
    # CSP_CLOSED is a transient state: the FSM immediately moves to IDLE.
    final_state = CycleState.IDLE if new_state == CycleState.CSP_CLOSED else new_state
    cycle.state = final_state.value
    cycle.total_premium_collected = (
        Decimal(str(cycle.total_premium_collected or 0)) + premium_delta
    )

    db.session.commit()
    return jsonify(
        {
            "from_state": old_state,
            "to_state": cycle.state,
            "event": event.value,
            "total_premium_collected": float(cycle.total_premium_collected),
        }
    )


@cycles_bp.get("/<uuid:cycle_id>/metrics")
@require_auth
def get_metrics(cycle_id):
    cycle = WheelCycle.query.filter_by(id=cycle_id, user_id=g.user_id).first_or_404()
    return jsonify(
        {
            "ticker": cycle.ticker,
            "state": cycle.state,
            "total_premium_collected": float(cycle.total_premium_collected),
            "capital_committed": (
                float(cycle.capital_committed)
                if cycle.capital_committed is not None
                else None
            ),
        }
    )
