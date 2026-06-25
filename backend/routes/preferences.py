from __future__ import annotations

from datetime import datetime, timezone

from flask import jsonify, request

from backend.auth.supabase import require_auth
from backend.models import db
from backend.models.user_preferences import DEFAULT_CONTRACTS, DEFAULT_DTE, UserPreferences


def _parse_optional_commission(raw) -> float | None:
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        return None
    value = float(raw)
    if value < 0:
        raise ValueError("commission_per_contract must be >= 0")
    return value


def _parse_positive_int(raw, field: str, fallback: int) -> int:
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        return fallback
    value = int(raw)
    if value < 1:
        raise ValueError(f"{field} must be >= 1")
    return value


def register_preferences_routes(preferences_bp):
    @preferences_bp.route("", methods=["GET"])
    @require_auth
    def get_preferences(user_id: str):
        row = UserPreferences.query.filter_by(user_id=user_id).first()
        if not row:
            return jsonify(UserPreferences.default_api_dict())
        return jsonify(row.to_api_dict())

    @preferences_bp.route("", methods=["PUT"])
    @require_auth
    def put_preferences(user_id: str):
        data = request.get_json() or {}
        try:
            commission = _parse_optional_commission(data.get("commission_per_contract"))
            contracts = _parse_positive_int(
                data.get("default_contracts"), "default_contracts", DEFAULT_CONTRACTS
            )
            dte = _parse_positive_int(data.get("default_dte"), "default_dte", DEFAULT_DTE)
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        row = UserPreferences.query.filter_by(user_id=user_id).first()
        if not row:
            row = UserPreferences(user_id=user_id)
            db.session.add(row)

        row.commission_per_contract = commission
        row.default_contracts = contracts
        row.default_dte = dte
        row.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify(row.to_api_dict())
