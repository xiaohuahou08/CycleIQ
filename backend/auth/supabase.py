"""Supabase Auth JWT verification helpers.

Supabase Auth issues HS256 JWTs signed with the project's JWT secret
(SUPABASE_JWT_SECRET).  The ``require_auth`` decorator verifies the token and
stores the caller's user UUID in ``flask.g.user_id`` for use by route handlers.

Usage::

    from backend.auth.supabase import require_auth
    from flask import g

    @app.get("/api/cycles")
    @require_auth
    def list_cycles():
        ...
"""

from __future__ import annotations

import uuid
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request


def _verify_token(token: str) -> dict:
    """Decode and verify a Supabase Auth JWT.

    Raises ``jwt.InvalidTokenError`` (or a subclass) on failure.
    Raises ``ValueError`` if ``SUPABASE_JWT_SECRET`` is missing (misconfiguration).
    """
    secret = current_app.config.get("SUPABASE_JWT_SECRET") or ""
    if not secret.strip():
        raise ValueError(
            "SUPABASE_JWT_SECRET is not set; add it in Render (or .env) from "
            "Supabase Dashboard → Settings → API → JWT Settings → JWT Secret"
        )
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
    )


def require_auth(f):
    """Route decorator that enforces a valid Supabase Auth Bearer token.

    On success, sets ``g.user_id`` to the caller's ``uuid.UUID``.
    Returns 401 JSON on missing, expired, or invalid tokens.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = _verify_token(token)
        except ValueError as e:
            return jsonify({"error": str(e)}), 503
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify(
                {
                    "error": "Invalid token",
                    "hint": "Check SUPABASE_JWT_SECRET matches Supabase JWT Secret (same project as the frontend).",
                }
            ), 401

        g.user_id = uuid.UUID(payload["sub"])
        return f(str(g.user_id), *args, **kwargs)

    return decorated
