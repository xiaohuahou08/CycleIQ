"""Tests for production config hardening and redirect-origin trust gating."""

import pytest

from backend.config import (
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
    get_config,
    resolve_frontend_origin,
)

_PROD_ENV = {
    "FLASK_ENV": "production",
    "SECRET_KEY": "a-strong-secret",
    "DATABASE_URL": "postgresql://u:p@host:5432/db",
    "SUPABASE_URL": "https://proj.supabase.co",
    "SUPABASE_JWT_SECRET": "jwtsecret",
    "STRIPE_SECRET_KEY": "sk_live_x",
    "STRIPE_WEBHOOK_SECRET": "whsec_x",
    "STRIPE_PRICE_PREMIUM_MONTHLY": "price_x",
    "FRONTEND_URL": "https://cycleiq.xyz",
}


def _apply_env(monkeypatch, env: dict) -> None:
    for key in set(_PROD_ENV) | set(env) | {"CORS_EXTRA_ORIGINS"}:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)


def test_get_config_valid_envs(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    assert get_config() is DevelopmentConfig
    monkeypatch.setenv("FLASK_ENV", "production")
    assert get_config() is ProductionConfig
    monkeypatch.setenv("FLASK_ENV", "testing")
    assert get_config() is TestingConfig


def test_get_config_rejects_invalid_env(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "prod")  # common typo
    with pytest.raises(RuntimeError):
        get_config()


def test_production_validate_passes_with_full_env(monkeypatch):
    _apply_env(monkeypatch, _PROD_ENV)
    ProductionConfig.validate()  # should not raise


def test_production_validate_requires_stripe(monkeypatch):
    env = dict(_PROD_ENV)
    del env["STRIPE_SECRET_KEY"]
    _apply_env(monkeypatch, env)
    with pytest.raises(RuntimeError) as exc:
        ProductionConfig.validate()
    assert "STRIPE_SECRET_KEY" in str(exc.value)


def test_production_validate_rejects_default_secret(monkeypatch):
    env = dict(_PROD_ENV)
    env["SECRET_KEY"] = "dev-secret-key"
    _apply_env(monkeypatch, env)
    with pytest.raises(RuntimeError) as exc:
        ProductionConfig.validate()
    assert "SECRET_KEY" in str(exc.value)


def test_production_validate_requires_cors_origin(monkeypatch):
    env = dict(_PROD_ENV)
    del env["FRONTEND_URL"]
    _apply_env(monkeypatch, env)
    with pytest.raises(RuntimeError) as exc:
        ProductionConfig.validate()
    assert "CORS" in str(exc.value) or "FRONTEND_URL" in str(exc.value)


def test_localhost_not_trusted_in_production(monkeypatch):
    _apply_env(monkeypatch, _PROD_ENV)
    result = resolve_frontend_origin("http://localhost:3000")
    assert result == "https://cycleiq.xyz"


def test_localhost_trusted_in_development(monkeypatch):
    env = dict(_PROD_ENV)
    env["FLASK_ENV"] = "development"
    _apply_env(monkeypatch, env)
    assert resolve_frontend_origin("http://localhost:3000") == "http://localhost:3000"
