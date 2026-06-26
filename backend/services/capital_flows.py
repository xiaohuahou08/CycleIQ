"""Capital deposit/withdrawal events for budget and TWR."""

from __future__ import annotations

import uuid
from datetime import date

from backend.models import db
from backend.models.capital_flow import CapitalFlow
from backend.models.user_preferences import DEFAULT_TOTAL_CAPITAL_BUDGET, UserPreferences
from backend.services.portfolio_returns import CapitalFlowEvent


def _get_or_create_preferences(user_id: str) -> UserPreferences:
    row = UserPreferences.query.filter_by(user_id=user_id).first()
    if row is None:
        row = UserPreferences(user_id=user_id)
        db.session.add(row)
        db.session.flush()
    return row


def list_capital_flows(user_id: str) -> list[CapitalFlow]:
    return (
        CapitalFlow.query.filter_by(user_id=user_id)
        .order_by(CapitalFlow.event_date.desc(), CapitalFlow.created_at.desc())
        .all()
    )


def capital_flow_events_for_user(user_id: str) -> list[CapitalFlowEvent]:
    return [
        CapitalFlowEvent(event_date=f.event_date, amount=float(f.amount))
        for f in list_capital_flows(user_id)
    ]


def add_capital_flow(
    user_id: str,
    *,
    event_date: date,
    amount: float,
    flow_type: str,
    today: date | None = None,
) -> CapitalFlow:
    today = today or date.today()
    if event_date > today:
        raise ValueError("event_date cannot be in the future")

    raw_amount = float(amount)
    if raw_amount <= 0:
        raise ValueError("amount must be > 0")

    normalized_type = flow_type.strip().lower()
    if normalized_type not in ("deposit", "withdrawal"):
        raise ValueError("type must be deposit or withdrawal")

    signed_amount = raw_amount if normalized_type == "deposit" else -raw_amount
    prefs = _get_or_create_preferences(user_id)
    current_budget = float(prefs.total_capital_budget or DEFAULT_TOTAL_CAPITAL_BUDGET)
    new_budget = current_budget + signed_amount
    if new_budget <= 0:
        raise ValueError("withdrawal would reduce capital budget to zero or below")

    flow = CapitalFlow(
        id=str(uuid.uuid4()),
        user_id=user_id,
        event_date=event_date,
        amount=signed_amount,
    )
    prefs.total_capital_budget = new_budget
    db.session.add(flow)
    db.session.commit()
    return flow


def delete_capital_flow(user_id: str, flow_id: str) -> None:
    flow = CapitalFlow.query.filter_by(id=flow_id, user_id=user_id).first()
    if flow is None:
        raise LookupError("capital flow not found")

    prefs = _get_or_create_preferences(user_id)
    current_budget = float(prefs.total_capital_budget or DEFAULT_TOTAL_CAPITAL_BUDGET)
    new_budget = current_budget - float(flow.amount)
    if new_budget <= 0:
        raise ValueError("removing this entry would reduce capital budget to zero or below")

    prefs.total_capital_budget = new_budget
    db.session.delete(flow)
    db.session.commit()
