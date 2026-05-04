"""Supabase Auth JWT verification helpers.

Supports:

- **HS256** (legacy): verify with ``SUPABASE_JWT_SECRET`` (Dashboard → JWT Secret).
- **ES256** (current Supabase): verify using JWKS at
  ``{iss}/.well-known/jwks.json`` where ``iss`` comes from the token
  (typically ``https://<ref>.supabase.co/auth/v1``).

The ``require_auth`` decorator sets ``flask.g.user_id`` and passes ``user_id``
into route handlers.
"""

from __future__ import annotations

import uuid
from functools import wraps
from typing import Any

import jwt
from jwt import PyJWKClient
from flask import current_app, g, jsonify, request

_jwks_clients: dict[str, PyJWKClient] = {}


def _jwks_client(url: str) -> PyJWKClient:
    if url not in _jwks_clients:
        _jwks_clients[url] = PyJWKClient(url)
    return _jwks_clients[url]


def _verify_token(token: str) -> dict[str, Any]:
    """Decode and verify a Supabase Auth JWT.

    Raises ``jwt.InvalidTokenError`` (or a subclass) on failure.
    Raises ``ValueError`` on server misconfiguration.
    """
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "HS256").upper()

    if alg == "HS256":
        secret = (current_app.config.get("SUPABASE_JWT_SECRET") or "").strip()
        if not secret:
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

    if alg in ("ES256", "RS256"):
        unverified = jwt.decode(
            token,
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": True,
            },
        )
        issuer = unverified.get("iss")
        if not issuer or not isinstance(issuer, str):
            raise jwt.InvalidTokenError("Token missing iss claim")
        jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
        jwk_client = _jwks_client(jwks_url)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            audience="authenticated",
            issuer=issuer,
        )

    raise jwt.InvalidTokenError(f"Unsupported JWT algorithm: {alg}")


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
                    "hint": (
                        "HS256: set SUPABASE_JWT_SECRET to the Supabase JWT secret. "
                        "ES256/RS256: ensure the token is from Supabase and JWKS is reachable."
                    ),
                }
            ), 401

        g.user_id = uuid.UUID(payload["sub"])
        return f(str(g.user_id), *args, **kwargs)

    return decorated
