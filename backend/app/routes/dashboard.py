"""Dashboard summary routes."""

from __future__ import annotations

from flask import Blueprint, g, jsonify

from ..auth import require_auth
from ..models import WheelCycle

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("/summary")
@require_auth
def summary():
    cycles = WheelCycle.query.filter_by(user_id=g.user_id).all()
    active = [c for c in cycles if c.state not in ("IDLE", "EXIT")]
    closed = [c for c in cycles if c.state == "EXIT"]
    total_premium = sum(float(c.total_premium_collected or 0) for c in cycles)
    return jsonify(
        {
            "total_cycles": len(cycles),
            "active_cycles": len(active),
            "closed_cycles": len(closed),
            "total_premium_collected": round(total_premium, 2),
        }
    )


@dashboard_bp.get("/positions")
@require_auth
def positions():
    """Return active WheelCycles (not IDLE or EXIT)."""
    active = (
        WheelCycle.query.filter_by(user_id=g.user_id)
        .filter(WheelCycle.state.notin_(["IDLE", "EXIT"]))
        .order_by(WheelCycle.ticker)
        .all()
    )
    return jsonify([c.to_dict() for c in active])
