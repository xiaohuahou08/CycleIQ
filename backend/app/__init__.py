"""CycleIQ Flask application factory."""

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from .database import db


def create_app(config_object=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration – support both repo-root (Docker) and backend/ (local)
    # working directories.
    if config_object is None:
        try:
            from config import get_config  # backend/ in sys.path (local dev / migrations)
        except ImportError:
            from backend.config import get_config  # repo root in sys.path (Docker)
        config_object = get_config()
    app.config.from_object(config_object)

    # Extensions
    CORS(app)
    db.init_app(app)
    Migrate(app, db)

    # Register models so Alembic / Flask-Migrate can detect them
    from . import models  # noqa: F401

    # Register blueprints
    from .routes import cycles_bp, dashboard_bp, trades_bp

    app.register_blueprint(cycles_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(trades_bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


# Compatibility entrypoint for WSGI servers configured as `backend.app:app`.
app = create_app()
