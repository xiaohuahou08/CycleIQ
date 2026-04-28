"""Trades routes – list/get individual Trade legs across all WheelCycles."""

from __future__ import annotations

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


# ---------------------------------------------------------------------------
# Backward-compatible POST /api/trades (flat frontend schema)
# Frontend sends: ticker, option_type, strike, expiry, premium,
#                 action (BUY/SELL), contracts, notes, trade_date
# We create/find a WheelCycle for the ticker, then add a Trade leg.
# ---------------------------------------------------------------------------

@trades_bp.post("")
@require_auth
def create_trade():
    data = request.get_json() or {}
    ticker = (data.get("ticker") or "").strip().upper()
    if not ticker:
        return jsonify({"error": "ticker is required"}), 400

    required = ["option_type", "strike", "expiration_date", "premium_per_contract"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400

    action = (data.get("action") or "BUY").upper()
    if action not in ("BUY", "SELL"):
        return jsonify({"error": "action must be BUY or SELL"}), 400

    option_type = data["option_type"].upper()
    if option_type not in ("PUT", "CALL"):
        return jsonify({"error": "option_type must be PUT or CALL"}), 400

    # Create or find the WheelCycle for this ticker.
    cycle = WheelCycle.query.filter_by(user_id=g.user_id, ticker=ticker).first()
    if cycle is None:
        cycle = WheelCycle(user_id=g.user_id, ticker=ticker)
        db.session.add(cycle)
        db.session.flush()  # get cycle.id

    from datetime import date
    from decimal import Decimal

    trade = Trade(
        wheel_cycle_id=cycle.id,
        option_type=option_type,
        action=action,
        strike=Decimal(str(data["strike"])),
        expiration_date=date.fromisoformat(data["expiration_date"]),
        contracts=int(data.get("contracts", 1)),
        premium_per_contract=Decimal(str(data["premium_per_contract"])),
        stock_price=(
            Decimal(str(data["stock_price"])) if data.get("stock_price") else None
        ),
        event="MANUAL",  # neutral event not from FSM
        trade_date=(
            date.fromisoformat(data["trade_date"])
            if data.get("trade_date")
            else date.today()
        ),
        notes=data.get("notes"),
    )
    db.session.add(trade)
    db.session.commit()
    return jsonify(_trade_dict(trade, cycle)), 201


# ---------------------------------------------------------------------------
# Backward-compatible PUT /api/trades/<id> (partial field update)
# ---------------------------------------------------------------------------

@trades_bp.put("/<uuid:trade_id>")
@require_auth
def update_trade(trade_id):
    row = (
        db.session.query(Trade, WheelCycle)
        .join(WheelCycle, Trade.wheel_cycle_id == WheelCycle.id)
        .filter(Trade.id == trade_id, WheelCycle.user_id == g.user_id)
        .first_or_404()
    )
    trade, cycle = row
    data = request.get_json() or {}

    from datetime import date
    from decimal import Decimal

    if "option_type" in data:
        ot = data["option_type"].upper()
        if ot not in ("PUT", "CALL"):
            return jsonify({"error": "option_type must be PUT or CALL"}), 400
        trade.option_type = ot

    if "action" in data:
        act = data["action"].upper()
        if act not in ("BUY", "SELL"):
            return jsonify({"error": "action must be BUY or SELL"}), 400
        trade.action = act

    if "strike" in data:
        trade.strike = Decimal(str(data["strike"]))

    if "expiration_date" in data:
        trade.expiration_date = date.fromisoformat(data["expiration_date"])

    if "contracts" in data:
        trade.contracts = int(data["contracts"])

    if "premium_per_contract" in data:
        trade.premium_per_contract = Decimal(str(data["premium_per_contract"]))

    if "trade_date" in data:
        trade.trade_date = date.fromisoformat(data["trade_date"])

    if "notes" in data:
        trade.notes = data["notes"]

    db.session.commit()
    return jsonify(_trade_dict(trade, cycle))