"""Flask application configuration.

Values are read from environment variables (set via .env or the host environment).
Copy .env.example to .env and fill in real values before running locally.
"""

import os
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
