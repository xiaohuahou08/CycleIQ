from __future__ import annotations

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.user_preferences import UserPreferences
from backend.services.screener.config import merge_screener_config, parse_screener_config
from backend.services.screener.scan import run_screen


def handle_screen_scan(user_id: str):
    data = request.get_json(silent=True) or {}
    prefs = UserPreferences.get_for_user(user_id)

    try:
        stored_screener = None
        if prefs is not None:
            try:
                stored_screener = prefs.screener_config
            except Exception:
                db.session.rollback()
                stored_screener = None
        if "config" in data and data["config"] is not None:
            cfg = parse_screener_config(data["config"])
        elif stored_screener:
            cfg = parse_screener_config(stored_screener)
        else:
            cfg = merge_screener_config(None)

        modes = data.get("modes")
        if modes is not None:
            if not isinstance(modes, list):
                raise ValueError("modes must be a list")
            modes = [str(m).lower() for m in modes]
            for m in modes:
                if m not in ("put", "call"):
                    raise ValueError("modes entries must be put or call")
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    commission = (
        float(prefs.commission_per_contract)
        if prefs and prefs.commission_per_contract is not None
        else None
    )
    capital = float(prefs.total_capital_budget) if prefs else None

    result = run_screen(
        user_id=user_id,
        cfg=cfg,
        commission_per_contract=commission,
        capital_budget=capital,
        modes=modes,
    )
    return jsonify(result)


screen_scan_view = require_auth(handle_screen_scan)


def register_screen_routes(screen_bp):
    screen_bp.add_url_rule("/scan", endpoint="scan", view_func=screen_scan_view, methods=["POST"])
    screen_bp.add_url_rule(
        "/scan/", endpoint="scan_slash", view_func=screen_scan_view, methods=["POST"]
    )


def register_screen_app_routes(app):
    """Bind scan on the app object so it cannot be dropped by blueprint timing."""
    app.add_url_rule(
        "/api/screen/scan",
        endpoint="screen_scan_app",
        view_func=screen_scan_view,
        methods=["POST"],
    )
    app.add_url_rule(
        "/api/screen/scan/",
        endpoint="screen_scan_app_slash",
        view_func=screen_scan_view,
        methods=["POST"],
    )

    @app.route("/api/screen/scan", methods=["GET"], endpoint="screen_scan_probe")
    @app.route("/api/screen/scan/", methods=["GET"], endpoint="screen_scan_probe_slash")
    def screen_scan_probe():
        return jsonify({"ok": True, "scan": "POST /api/screen/scan"})
