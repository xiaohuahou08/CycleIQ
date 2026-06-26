"""Trades routes – list/get individual Trade legs across all WheelCycles."""

from __future__ import annotations

from datetime import date

from flask import Blueprint, g, jsonify, request

from ..auth import require_auth
from ..database import db
from ..models import Trade, WheelCycle

trades_bp = Blueprint("trades", __name__, url_prefix="/api/trades")


def _trade_dict(trade: Trade, cycle: WheelCycle) -> dict:
    """Serialize a Trade with its parent WheelCycle context."""
    d = trade.to_dict()
    d["ticker"] = cycle.ticker
    d["cycle_state"] = cycle.state
    return d


def _parse_iso_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _resolve_cycle(data: dict, fallback_cycle: WheelCycle | None = None) -> WheelCycle:
    cycle_id = data.get("wheel_cycle_id")
    if cycle_id:
        return WheelCycle.query.filter_by(id=cycle_id, user_id=g.user_id).first_or_404()

    ticker = (data.get("ticker") or "").strip().upper()
    if ticker:
        # Always create a fresh cycle when only a ticker is given.
        # Reuse only happens when wheel_cycle_id is explicitly provided (e.g. Roll).
        cycle = WheelCycle(user_id=g.user_id, ticker=ticker)
        db.session.add(cycle)
        db.session.flush()
        return cycle

    if fallback_cycle is not None:
        return fallback_cycle

    raise ValueError("wheel_cycle_id or ticker is required")


def _apply_trade_payload(trade: Trade, data: dict, cycle: WheelCycle):
    option_type = data.get("option_type", trade.option_type)
    if option_type:
        option_type = str(option_type).upper()
    trade.option_type = option_type
    trade.action = (data.get("action") or trade.action or "SELL").upper()
    trade.strike = data.get("strike", trade.strike)
    trade.expiration_date = _parse_iso_date(
        data.get("expiration_date") or data.get("expiry") or trade.expiration_date
    )
    trade.contracts = int(data.get("contracts", trade.contracts or 1))
    premium = data.get("premium_per_contract")
    if premium is None:
        premium = data.get("premium")
    if premium is not None:
        trade.premium_per_contract = premium
    stock_price = data.get("stock_price")
    if stock_price is None:
        stock_price = data.get("current_price")
    if stock_price is not None:
        trade.stock_price = stock_price
    trade.event = data.get("event", trade.event or "MANUAL")
    trade.trade_date = _parse_iso_date(data.get("trade_date")) or trade.trade_date or date.today()
    if "notes" in data:
        trade.notes = data.get("notes")
    trade.wheel_cycle_id = cycle.id


@trades_bp.get("")
@require_auth
def list_trades():
    query = (
        db.session.query(Trade, WheelCycle)
        .join(WheelCycle, Trade.wheel_cycle_id == WheelCycle.id)
        .filter(WheelCycle.user_id == g.user_id)
    )
    if ticker := request.args.get("ticker"):
        query = query.filter(WheelCycle.ticker == ticker.upper())
    if event := request.args.get("event"):
        query = query.filter(Trade.event == event)
    rows = query.order_by(Trade.created_at.desc()).all()
    return jsonify([_trade_dict(t, c) for t, c in rows])


@trades_bp.post("")
@require_auth
def create_trade():
    data = request.get_json() or {}
    try:
        cycle = _resolve_cycle(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    trade = Trade(
        wheel_cycle_id=cycle.id,
        action="SELL",
        event="MANUAL",
        trade_date=date.today(),
        contracts=1,
    )
    _apply_trade_payload(trade, data, cycle)
    db.session.add(trade)
    db.session.commit()
    return jsonify(_trade_dict(trade, cycle)), 201


@trades_bp.get("/<uuid:trade_id>")
@require_auth
def get_trade(trade_id):
    row = (
        db.session.query(Trade, WheelCycle)
        .join(WheelCycle, Trade.wheel_cycle_id == WheelCycle.id)
        .filter(Trade.id == trade_id, WheelCycle.user_id == g.user_id)
        .first_or_404()
    )
    return jsonify(_trade_dict(*row))


@trades_bp.put("/<uuid:trade_id>")
@require_auth
def update_trade(trade_id):
    row = (
        db.session.query(Trade, WheelCycle)
        .join(WheelCycle, Trade.wheel_cycle_id == WheelCycle.id)
        .filter(Trade.id == trade_id, WheelCycle.user_id == g.user_id)
        .first_or_404()
    )
    trade, existing_cycle = row
    data = request.get_json() or {}
    try:
        cycle = _resolve_cycle(data, fallback_cycle=existing_cycle)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    _apply_trade_payload(trade, data, cycle)
    db.session.commit()
    return jsonify(_trade_dict(trade, cycle))


@trades_bp.delete("/<uuid:trade_id>")
@require_auth
def delete_trade(trade_id):
    row = (
        db.session.query(Trade, WheelCycle)
        .join(WheelCycle, Trade.wheel_cycle_id == WheelCycle.id)
        .filter(Trade.id == trade_id, WheelCycle.user_id == g.user_id)
        .first_or_404()
    )
    trade, _ = row
    db.session.delete(trade)
    db.session.commit()
    return "", 204