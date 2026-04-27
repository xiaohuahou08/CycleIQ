"""
Supabase JWT verification for Flask routes.

Verifies Bearer tokens against Supabase's Auth API.
Requires:
  - SUPABASE_URL   (e.g. https://xxx.supabase.co)
  - SUPABASE_ANON_KEY (the anon/public key from Supabase dashboard)
  - SUPABASE_JWT_SECRET (for server-side JWT verification, optional
    if you prefer to always call Supabase Auth /userinfo endpoint)

Usage:
  from backend.auth.supabase import require_auth

  @trades_bp.route("/me", methods=["GET"])
  @require_auth
  def me(user_id):
      # user_id is the Supabase user UUID
      ...
"""
from __future__ import annotations

import os
import jwt  # PyJWT
import httpx
from functools import wraps
from flask import request, jsonify, current_app


def _get_jwt_secret(supabase_url: str, supabase_anon_key: str) -> str | None:
    """
    Derive the JWT secret from SUPABASE_ANON_KEY (HS256).
    Supabase uses the anon key as the signing secret for HS256 tokens.
    Fallback: try SUPABASE_JWT_SECRET env var if set.
    """
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if secret:
        return secret
    # The anon key is a JWT signed with the same secret
    # We decode without verification to extract the secret from header/payload
    # but it's easier to just let PyJWT verify against anon_key prefix
    # Since Supabase signs HS256 with the anon_key, we use a portion of it.
    return None  # will use /userinfo fallback


def _verify_via_userinfo(token: str, supabase_url: str, anon_key: str) -> dict | None:
    """Verify token by calling Supabase Auth /userinfo endpoint."""
    try:
        resp = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": anon_key,
            },
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


def _decode_jwt(token: str, secret: str) -> dict | None:
    """Decode + verify a Supabase HS256 JWT locally."""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    """
    Flask decorator: validates the Bearer token in Authorization header.

    On success, passes `user_id` (Supabase UUID) as first arg to the route.
    Returns 401 if missing/invalid, 500 on unexpected error.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header[7:]

        supabase_url = current_app.config.get("SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
        anon_key = current_app.config.get("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

        # Strategy 1: local JWT decode (fastest, no network call)
        if jwt_secret:
            payload = _decode_jwt(token, jwt_secret)
            if payload:
                # sub is the user ID in Supabase JWTs
                user_id = payload.get("sub")
                if user_id:
                    return f(user_id, *args, **kwargs)

        # Strategy 2: verify via Supabase /userinfo endpoint
        if supabase_url and anon_key:
            user_info = _verify_via_userinfo(token, supabase_url, anon_key)
            if user_info:
                return f(user_info.get("id"), *args, **kwargs)

        return jsonify({"error": "Invalid or expired token"}), 401

    return decorated


def optional_auth(f):
    """
    Like require_auth, but does NOT reject requests without a token.
    Passes user_id (or None) to the route.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        user_id = None

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            supabase_url = current_app.config.get("SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
            anon_key = current_app.config.get("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
            jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

            if jwt_secret:
                payload = _decode_jwt(token, jwt_secret)
                if payload:
                    user_id = payload.get("sub")

            if not user_id and supabase_url and anon_key:
                user_info = _verify_via_userinfo(token, supabase_url, anon_key)
                if user_info:
                    user_id = user_info.get("id")

        return f(user_id, *args, **kwargs)

    return decorated
