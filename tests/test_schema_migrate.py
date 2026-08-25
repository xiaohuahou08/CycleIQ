"""Startup schema migrate helpers skip non-Postgres URLs."""

from backend.services.schema_migrate import apply_pending_migrations, migrations_directory


def test_migrations_directory_points_at_backend_migrations():
    path = migrations_directory().replace("\\", "/")
    assert path.endswith("backend/migrations")


def test_apply_pending_migrations_skips_sqlite(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.delenv("DATABASE_POOL_URL", raising=False)
    apply_pending_migrations()  # must not connect or raise


def test_get_for_user_returns_none_when_missing():
    from backend.app import create_app
    from backend.config import TestingConfig
    from backend.models import db
    from backend.models.user_preferences import UserPreferences

    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        assert UserPreferences.get_for_user("missing") is None
        db.drop_all()
