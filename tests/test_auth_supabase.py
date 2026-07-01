"""Tests for Supabase JWT verification, focused on issuer pinning.

The critical security property: ES256/RS256 tokens must be verified against a
JWKS fetched from OUR Supabase project's issuer, never an issuer taken from the
(attacker-controlled) token itself.
"""

import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch

import jwt
import pytest

pytest.importorskip("flask_cors")

_root = Path(__file__).resolve().parents[1]
_app_path = _root / "backend" / "app.py"
_spec = importlib.util.spec_from_file_location("cycleiq_backend_app_module", _app_path)
assert _spec and _spec.loader
_app_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_app_mod)
create_app = _app_mod.create_app

from backend.auth import supabase as supabase_auth
from backend.config import TestingConfig

HS_SECRET = "unit_test_jwt_secret"
PROJECT_URL = "https://proj.supabase.co"
EXPECTED_ISSUER = "https://proj.supabase.co/auth/v1"
USER_ID = "00000000-0000-0000-0000-000000000099"


@pytest.fixture
def app():
    application = create_app(config_class=TestingConfig)
    application.config["SUPABASE_JWT_SECRET"] = HS_SECRET
    return application


def _hs256(payload: dict) -> str:
    return jwt.encode(payload, HS_SECRET, algorithm="HS256")


# --- HS256 issuer enforcement ------------------------------------------------


def test_hs256_without_supabase_url_skips_issuer(app):
    """Local dev: no SUPABASE_URL configured -> tokens without iss still work."""
    app.config["SUPABASE_URL"] = ""
    token = _hs256({"sub": USER_ID, "aud": "authenticated"})
    with app.app_context():
        payload = supabase_auth._verify_token(token)
    assert payload["sub"] == USER_ID


def test_hs256_with_supabase_url_accepts_matching_issuer(app):
    app.config["SUPABASE_URL"] = PROJECT_URL
    token = _hs256({"sub": USER_ID, "aud": "authenticated", "iss": EXPECTED_ISSUER})
    with app.app_context():
        payload = supabase_auth._verify_token(token)
    assert payload["sub"] == USER_ID


def test_hs256_with_supabase_url_rejects_missing_issuer(app):
    app.config["SUPABASE_URL"] = PROJECT_URL
    token = _hs256({"sub": USER_ID, "aud": "authenticated"})
    with app.app_context():
        with pytest.raises(jwt.InvalidTokenError):
            supabase_auth._verify_token(token)


def test_hs256_with_supabase_url_rejects_wrong_issuer(app):
    app.config["SUPABASE_URL"] = PROJECT_URL
    token = _hs256(
        {"sub": USER_ID, "aud": "authenticated", "iss": "https://evil.com/auth/v1"}
    )
    with app.app_context():
        with pytest.raises(jwt.InvalidIssuerError):
            supabase_auth._verify_token(token)


# --- ES256 / asymmetric issuer pinning --------------------------------------


def _es256_token(payload: dict):
    crypto = pytest.importorskip("cryptography")
    from cryptography.hazmat.primitives.asymmetric import ec

    key = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(payload, key, algorithm="ES256")
    return token, key


def test_es256_requires_supabase_url(app):
    app.config["SUPABASE_URL"] = ""
    token, _ = _es256_token({"sub": USER_ID, "aud": "authenticated", "iss": EXPECTED_ISSUER})
    with app.app_context():
        with pytest.raises(ValueError):
            supabase_auth._verify_token(token)


def test_es256_rejects_untrusted_issuer_before_jwks(app):
    """A token claiming a foreign issuer is rejected without any JWKS fetch."""
    app.config["SUPABASE_URL"] = PROJECT_URL
    token, _ = _es256_token(
        {"sub": USER_ID, "aud": "authenticated", "iss": "https://evil.com/auth/v1"}
    )
    with app.app_context():
        with patch.object(supabase_auth, "_jwks_client") as mock_jwks:
            with pytest.raises(jwt.InvalidIssuerError):
                supabase_auth._verify_token(token)
            mock_jwks.assert_not_called()


def test_es256_uses_expected_issuer_for_jwks(app):
    """JWKS URL is derived from SUPABASE_URL, not from the token's iss."""
    app.config["SUPABASE_URL"] = PROJECT_URL
    token, key = _es256_token(
        {"sub": USER_ID, "aud": "authenticated", "iss": EXPECTED_ISSUER}
    )
    fake_signing_key = MagicMock(key=key.public_key())
    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = fake_signing_key

    with app.app_context():
        with patch.object(supabase_auth, "_jwks_client", return_value=fake_client) as mock_jwks:
            payload = supabase_auth._verify_token(token)

    assert payload["sub"] == USER_ID
    mock_jwks.assert_called_once_with(f"{EXPECTED_ISSUER}/.well-known/jwks.json")
