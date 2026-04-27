"""CycleIQ Flask application factory."""

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from .database import db


def create_app(config_object=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    if config_object is None:
        from config import get_config
        config_object = get_config()
    app.config.from_object(config_object)

    # Extensions
    CORS(app)
    db.init_app(app)
    Migrate(app, db)

    # Register models so Alembic / Flask-Migrate can detect them
    from . import models  # noqa: F401

    # Register blueprints (add routes here as they are implemented)
    # from .routes.cycles import cycles_bp
    # app.register_blueprint(cycles_bp, url_prefix="/api/cycles")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
