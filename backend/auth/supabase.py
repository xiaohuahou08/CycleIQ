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


def _expected_issuer() -> str | None:
    """Canonical Supabase Auth issuer derived from ``SUPABASE_URL``.

    Returns ``https://<ref>.supabase.co/auth/v1`` or ``None`` when ``SUPABASE_URL``
    is not configured (local dev forging HS256 tokens without an issuer).
    """
    base = (current_app.config.get("SUPABASE_URL") or "").strip().rstrip("/")
    if not base:
        return None
    return f"{base}/auth/v1"


def _verify_token(token: str) -> dict[str, Any]:
    """Decode and verify a Supabase Auth JWT.

    Raises ``jwt.InvalidTokenError`` (or a subclass) on failure.
    Raises ``ValueError`` on server misconfiguration.
    """
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "HS256").upper()
    expected_issuer = _expected_issuer()

    if alg == "HS256":
        secret = (current_app.config.get("SUPABASE_JWT_SECRET") or "").strip()
        if not secret:
            raise ValueError(
                "SUPABASE_JWT_SECRET is not set; add it in Render (or .env) from "
                "Supabase Dashboard → Settings → API → JWT Settings → JWT Secret"
            )
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["HS256"],
            "audience": "authenticated",
        }
        # Enforce issuer only when SUPABASE_URL is configured so locally-forged
        # HS256 tokens (which omit `iss`) still work for development.
        if expected_issuer:
            decode_kwargs["issuer"] = expected_issuer
        return jwt.decode(token, secret, **decode_kwargs)

    if alg in ("ES256", "RS256"):
        # Asymmetric tokens are verified against a JWKS fetched from the issuer.
        # The issuer MUST be pinned to our Supabase project, otherwise an attacker
        # who controls any domain could host a JWKS and mint valid-looking tokens.
        if not expected_issuer:
            raise ValueError(
                "SUPABASE_URL is not set; it is required to verify ES256/RS256 "
                "Supabase tokens (used to pin the trusted JWKS issuer)."
            )
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
        if issuer.rstrip("/") != expected_issuer:
            raise jwt.InvalidIssuerError(
                "Token issuer does not match the configured Supabase project"
            )
        jwks_url = f"{expected_issuer}/.well-known/jwks.json"
        jwk_client = _jwks_client(jwks_url)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            audience="authenticated",
            issuer=expected_issuer,
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
        except Exception:
            # JWKS fetch failures, SSL/network errors, or any unexpected error.
            # Treat as an auth failure (401) rather than a 500 so the client can react.
            current_app.logger.exception("Token verification raised an unexpected error")
            return jsonify(
                {
                    "error": "Could not verify token",
                    "hint": "JWKS endpoint unreachable or token malformed. Try signing in again.",
                }
            ), 401

        sub = payload.get("sub")
        if not sub:
            return jsonify({"error": "Token missing sub claim"}), 401
        try:
            g.user_id = uuid.UUID(str(sub))
        except (ValueError, TypeError):
            return jsonify({"error": "Token sub is not a valid UUID"}), 401
        g.user_email = payload.get("email")
        return f(str(g.user_id), *args, **kwargs)

    return decorated
