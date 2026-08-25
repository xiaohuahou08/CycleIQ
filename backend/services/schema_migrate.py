"""Apply Alembic (and 0015 safety net) when the native Render start command skips it."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from sqlalchemy import create_engine, text

_BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = _BACKEND_DIR / "migrations"
logger = logging.getLogger(__name__)


def migrations_directory() -> str:
    return str(MIGRATIONS_DIR)


def migration_database_url() -> str:
    """Prefer the direct Postgres URI; PgBouncer (6543) is unreliable for DDL."""
    return (
        os.environ.get("DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_POOL_URL", "").strip()
    )


def _is_postgres(url: str) -> bool:
    return url.startswith("postgres://") or url.startswith("postgresql://")


def apply_pending_migrations() -> None:
    """Run `alembic upgrade heads` plus idempotent schema safety nets.

    Render's live start command is `gunicorn backend.app:app` and never cds into
    `backend/` or runs Alembic. Production then 500s on any UserPreferences
    query once the model includes columns the DB does not have.
    """
    url = migration_database_url()
    if not _is_postgres(url):
        return

    engine = create_engine(url, pool_pre_ping=True)
    try:
        # DDL first and without advisory locks — PgBouncer transaction mode
        # rejects pg_advisory_lock and would skip these statements entirely.
        _ensure_screener_config_column(engine)
        _drop_unused_capital_flows(engine)
        try:
            _upgrade_heads(url)
        except Exception:
            logger.exception("Alembic upgrade heads failed after schema safety nets")
    finally:
        engine.dispose()


def _upgrade_heads(url: str) -> None:
    from alembic import command
    from alembic.config import Config

    ini = _BACKEND_DIR / "alembic.ini"
    cfg = Config(str(ini) if ini.is_file() else None)
    cfg.set_main_option("script_location", str(MIGRATIONS_DIR).replace("%", "%%"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    command.upgrade(cfg, "heads")
    logger.info("Alembic upgrade heads completed")


def _ensure_screener_config_column(engine) -> None:
    """Idempotent fallback if alembic_version is already at 0015 but the column was never added."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE user_preferences "
                "ADD COLUMN IF NOT EXISTS screener_config JSON"
            )
        )
    logger.info("Ensured user_preferences.screener_config exists")


def _drop_unused_capital_flows(engine) -> None:
    """Drop capital_flows even if Alembic is stuck behind a failed 0015."""
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS capital_flows"))
    logger.info("Ensured capital_flows table is dropped")
