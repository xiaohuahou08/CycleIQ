"""Persisted wheel cycle FSM: JSON transition log ↔ cycleiq.wheel_fsm.Cycle."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from cycleiq.wheel_fsm import (
    Cycle,
    CycleEvent,
    CycleState,
    InvalidTransitionError,
    OptionAction,
    OptionLeg,
    OptionType,
    StockAction,
    StockLeg,
)


def _leg_to_dict(leg: OptionLeg) -> dict[str, Any]:
    return {
        "type": leg.type.value,
        "action": leg.action.value,
        "strike": str(leg.strike),
        "expiry": leg.expiry.isoformat(),
        "premium": str(leg.premium),
        "quantity": leg.quantity,
        "assigned": leg.assigned,
    }


def _leg_from_dict(d: dict[str, Any]) -> OptionLeg:
    return OptionLeg(
        type=OptionType(d["type"]),
        action=OptionAction(d["action"]),
        strike=Decimal(str(d["strike"])),
        expiry=date.fromisoformat(d["expiry"]),
        premium=Decimal(str(d["premium"])),
        quantity=int(d.get("quantity", 1)),
        assigned=bool(d.get("assigned", False)),
    )


def _stock_to_dict(leg: StockLeg | None) -> dict[str, Any] | None:
    if leg is None:
        return None
    return {
        "action": leg.action.value,
        "price": str(leg.price),
        "quantity": leg.quantity,
    }


def _stock_from_dict(d: dict[str, Any] | None) -> StockLeg | None:
    if not d:
        return None
    return StockLeg(
        action=StockAction(d["action"]),
        price=Decimal(str(d["price"])),
        quantity=int(d.get("quantity", 100)),
    )


def transition_to_dict(transition: Any) -> dict[str, Any]:
    return {
        "event": transition.event.value,
        "timestamp": transition.timestamp.isoformat(),
        "from_state": transition.from_state.value,
        "to_state": transition.to_state.value,
        "option_legs": [_leg_to_dict(l) for l in transition.option_legs],
        "stock_leg": _stock_to_dict(transition.stock_leg),
    }


def replay_cycle(ticker: str, log_json: str) -> Cycle:
    entries: list[dict[str, Any]] = json.loads(log_json or "[]")
    cycle = Cycle(ticker=ticker.upper())
    for e in entries:
        event = CycleEvent(e["event"])
        legs = [_leg_from_dict(x) for x in e.get("option_legs", [])]
        stock = _stock_from_dict(e.get("stock_leg"))
        ts = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
        cycle.apply_event(event, legs, stock, timestamp=ts)
    return cycle


def append_transition(log_json: str, transition: Any) -> str:
    entries: list[dict[str, Any]] = json.loads(log_json or "[]")
    entries.append(transition_to_dict(transition))
    return json.dumps(entries)


def metrics_to_response(m: Any) -> dict[str, float | int]:
    return {
        "total_premium_collected": float(m.total_premium_collected),
        "stock_pnl": float(m.stock_pnl),
        "total_cycle_pnl": float(m.total_cycle_pnl),
        "days_in_cycle": int(m.days_in_cycle),
        "annualized_return": float(m.annualized_return),
        "win_rate": float(m.win_rate),
        "roll_count": int(m.roll_count),
    }


def state_payload(cycle: Cycle) -> dict[str, Any]:
    pos = cycle.current_position
    return {
        "state": cycle.state.value,
        "position": {
            "shares": pos.shares,
            "strike": float(pos.strike) if pos.strike is not None else None,
            "expiry": pos.expiry.isoformat() if pos.expiry is not None else None,
        },
    }


def apply_api_event(cycle: Cycle, event_name: str, params: dict[str, Any]) -> Any:
    """Map Issue #7 REST events to CycleEvent + legs."""
    params = params or {}
    now = datetime.now(timezone.utc)
    st = cycle.state

    if event_name == "sell_csp":
        strike = Decimal(str(params["strike"]))
        expiry = date.fromisoformat(str(params["expiry"]))
        premium = Decimal(str(params["premium"]))
        leg = OptionLeg(
            type=OptionType.PUT,
            action=OptionAction.SELL,
            strike=strike,
            expiry=expiry,
            premium=premium,
            quantity=1,
        )
        return cycle.apply_event(CycleEvent.SELL_CSP, [leg], None, timestamp=now)

    if event_name == "sell_cc":
        strike = Decimal(str(params["strike"]))
        expiry = date.fromisoformat(str(params["expiry"]))
        premium = Decimal(str(params["premium"]))
        leg = OptionLeg(
            type=OptionType.CALL,
            action=OptionAction.SELL,
            strike=strike,
            expiry=expiry,
            premium=premium,
            quantity=1,
        )
        return cycle.apply_event(CycleEvent.SELL_CC, [leg], None, timestamp=now)

    if event_name == "expire_otm":
        if st == CycleState.CSP_OPEN:
            return cycle.apply_event(CycleEvent.CSP_EXPIRE_OTM, [], None, timestamp=now)
        if st == CycleState.CC_OPEN:
            return cycle.apply_event(CycleEvent.CC_EXPIRE_OTM, [], None, timestamp=now)
        raise InvalidTransitionError("expire_otm is only valid from CSP_OPEN or CC_OPEN")

    if event_name == "assigned":
        shares = int(params.get("shares", 100))
        if st == CycleState.CSP_OPEN:
            fallback = cycle.current_position.strike
            override = params.get("assignment_price")
            if override is not None:
                px = Decimal(str(override))
            elif fallback is not None:
                px = fallback
            else:
                raise ValueError("Missing strike on open CSP position")
            stock = StockLeg(action=StockAction.BUY, price=px, quantity=shares)
            return cycle.apply_event(CycleEvent.CSP_ASSIGNED, [], stock, timestamp=now)
        if st == CycleState.CC_OPEN:
            fallback = cycle.current_position.strike
            override = params.get("assignment_price")
            if override is not None:
                px = Decimal(str(override))
            elif fallback is not None:
                px = fallback
            else:
                raise ValueError("Missing strike on open CC position")
            stock = StockLeg(action=StockAction.SELL, price=px, quantity=shares)
            return cycle.apply_event(CycleEvent.CC_ASSIGNED, [], stock, timestamp=now)
        raise InvalidTransitionError("assigned is only valid from CSP_OPEN or CC_OPEN")

    if event_name == "roll":
        new_strike = Decimal(str(params["new_strike"]))
        new_expiry = date.fromisoformat(str(params["new_expiry"]))
        net_premium = Decimal(str(params["net_premium"]))
        old_strike = cycle.current_position.strike
        old_expiry = cycle.current_position.expiry
        if old_strike is None or old_expiry is None:
            raise ValueError("No open option position to roll")

        if st == CycleState.CSP_OPEN:
            buy = OptionLeg(
                type=OptionType.PUT,
                action=OptionAction.BUY,
                strike=old_strike,
                expiry=old_expiry,
                premium=Decimal("0.01"),
                quantity=1,
            )
            sell = OptionLeg(
                type=OptionType.PUT,
                action=OptionAction.SELL,
                strike=new_strike,
                expiry=new_expiry,
                premium=net_premium + Decimal("0.01"),
                quantity=1,
            )
            return cycle.apply_event(CycleEvent.CSP_ROLL, [buy, sell], None, timestamp=now)

        if st == CycleState.CC_OPEN:
            buy = OptionLeg(
                type=OptionType.CALL,
                action=OptionAction.BUY,
                strike=old_strike,
                expiry=old_expiry,
                premium=Decimal("0.01"),
                quantity=1,
            )
            sell = OptionLeg(
                type=OptionType.CALL,
                action=OptionAction.SELL,
                strike=new_strike,
                expiry=new_expiry,
                premium=net_premium + Decimal("0.01"),
                quantity=1,
            )
            return cycle.apply_event(CycleEvent.CC_ROLL, [buy, sell], None, timestamp=now)

        raise InvalidTransitionError("roll is only valid from CSP_OPEN or CC_OPEN")

    raise ValueError(f"Unknown event: {event_name}")
