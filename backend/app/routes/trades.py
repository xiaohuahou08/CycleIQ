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
