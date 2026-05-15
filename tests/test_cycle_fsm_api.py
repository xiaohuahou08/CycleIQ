"""Tests for backend.services.cycle_fsm.apply_api_event REST mapping."""

from decimal import Decimal

from backend.services.cycle_fsm import apply_api_event, replay_cycle


def test_assigned_event_uses_assignment_price_when_provided() -> None:
    cycle = replay_cycle("HIMS", "[]")
    apply_api_event(
        cycle,
        "sell_csp",
        {
            "strike": 28.0,
            "expiry": "2026-05-15",
            "premium": 1.5,
        },
    )
    transition = apply_api_event(
        cycle,
        "assigned",
        {"shares": 300, "assignment_price": 27.5},
    )
    assert transition.stock_leg is not None
    assert transition.stock_leg.price == Decimal("27.5")


def test_assigned_event_falls_back_to_position_strike_without_override() -> None:
    cycle = replay_cycle("HIMS", "[]")
    apply_api_event(
        cycle,
        "sell_csp",
        {
            "strike": 28.0,
            "expiry": "2026-05-15",
            "premium": 1.5,
        },
    )
    transition = apply_api_event(cycle, "assigned", {"shares": 300})
    assert transition.stock_leg is not None
    assert transition.stock_leg.price == Decimal("28")
