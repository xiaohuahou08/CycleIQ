"""Startup schema migrate helpers skip non-Postgres URLs."""

from backend.services.schema_migrate import apply_pending_migrations, migrations_directory


def test_migrations_directory_points_at_backend_migrations():
    path = migrations_directory().replace("\\", "/")
    assert path.endswith("backend/migrations")


def test_apply_pending_migrations_skips_sqlite(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.delenv("DATABASE_POOL_URL", raising=False)
    apply_pending_migrations()  # must not connect or raise
