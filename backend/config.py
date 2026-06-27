"""Flask application configuration.

Values are read from environment variables (set via .env or the host environment).
Copy .env.example to .env and fill in real values before running locally.
"""

import os
import re
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env regardless of cwd (repo root vs backend/)
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()


class Config:
    # Flask core
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key")
    DEBUG: bool = False
    TESTING: bool = False

    # SQLAlchemy – use the pooling URL in production (PgBouncer on port 6543)
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        "sqlite:///cycleiq_dev.db",  # local fallback for development without Supabase
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # Supabase client credentials
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")

    # Supabase Auth JWT secret – used to verify tokens issued by Supabase Auth.
    # Find it in: Supabase Dashboard → Settings → API → JWT Settings → JWT Secret
    SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")

    # Stripe billing
    STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_PREMIUM_MONTHLY: str = os.environ.get("STRIPE_PRICE_PREMIUM_MONTHLY", "")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


# Vercel preview deploys (*.vercel.app) — allowed in production CORS alongside FRONTEND_URL.
VERCEL_PREVIEW_ORIGIN = re.compile(r"^https://[\w-]+(?:-[\w-]+)*\.vercel\.app$")

# Localhost origins are always trusted for redirects (local dev).
_LOCALHOST_ORIGIN = re.compile(r"^http://(?:localhost|127\.0\.0\.1)(?::\d+)?$")


def _trusted_redirect_origins() -> list[str]:
    """Exact-match origins trusted for Stripe redirects (FRONTEND_URL + extras)."""
    origins: list[str] = []
    frontend = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    if frontend:
        origins.append(frontend)
    for part in os.environ.get("CORS_EXTRA_ORIGINS", "").split(","):
        origin = part.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins


def resolve_frontend_origin(request_origin: str | None) -> str:
    """Pick the redirect base URL for Stripe.

    Prefer the caller's Origin when it is trusted (FRONTEND_URL, CORS_EXTRA_ORIGINS,
    *.vercel.app preview deploys, or localhost). This lets every Vercel preview
    deploy redirect back to itself without reconfiguring FRONTEND_URL each time.
    Falls back to FRONTEND_URL when the Origin is missing or untrusted.
    """
    fallback = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
    if not request_origin:
        return fallback

    candidate = request_origin.strip().rstrip("/")
    if not candidate:
        return fallback

    if candidate in _trusted_redirect_origins():
        return candidate
    if _LOCALHOST_ORIGIN.match(candidate):
        return candidate
    if VERCEL_PREVIEW_ORIGIN.match(candidate):
        return candidate
    return fallback


def cors_allowed_origins() -> list[str] | None:
    """Explicit browser origins for CORS, or None to allow all (local dev only)."""
    # Non-production: allow any origin (localhost, 127.0.0.1, alternate dev ports).
    if os.environ.get("FLASK_ENV", "development") != "production":
        return None

    frontend = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    extras = [
        part.strip().rstrip("/")
        for part in os.environ.get("CORS_EXTRA_ORIGINS", "").split(",")
        if part.strip()
    ]
    origins: list[str] = []
    if frontend:
        origins.append(frontend)
    for origin in extras:
        if origin not in origins:
            origins.append(origin)
    if origins:
        origins.append(VERCEL_PREVIEW_ORIGIN)
        return origins
    if os.environ.get("FLASK_ENV") == "production":
        return []
    return None


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    # In production use the PgBouncer pooling URL for Flask connections
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_POOL_URL",
        os.environ.get("DATABASE_URL", ""),
    )


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_by_name: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
