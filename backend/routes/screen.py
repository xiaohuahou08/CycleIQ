from __future__ import annotations

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models.user_preferences import UserPreferences
from backend.services.screener.config import merge_screener_config, parse_screener_config
from backend.services.screener.scan import run_screen


def register_screen_routes(screen_bp):
    @screen_bp.route("/scan", methods=["POST"])
    @screen_bp.route("/scan/", methods=["POST"])
    @require_auth
    def screen_scan(user_id: str):
        data = request.get_json(silent=True) or {}
        prefs = UserPreferences.query.filter_by(user_id=user_id).first()

        try:
            if "config" in data and data["config"] is not None:
                cfg = parse_screener_config(data["config"])
            elif prefs and prefs.screener_config:
                cfg = parse_screener_config(prefs.screener_config)
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

        commission = float(prefs.commission_per_contract) if prefs and prefs.commission_per_contract is not None else None
        capital = float(prefs.total_capital_budget) if prefs else None

        result = run_screen(
            user_id=user_id,
            cfg=cfg,
            commission_per_contract=commission,
            capital_budget=capital,
            modes=modes,
        )
        return jsonify(result)
