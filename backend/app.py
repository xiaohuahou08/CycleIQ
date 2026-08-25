"""Local development entrypoint — run with `python backend/app.py` from repo root."""

import os

from backend.app import create_app as _create_app
from backend.config import DevelopmentConfig
from backend.models import db


def create_app(config_class=DevelopmentConfig):
    """Dev/test wrapper; production WSGI uses `backend.app:app` directly."""
    application = _create_app(config_class)
    if config_class is DevelopmentConfig:
        with application.app_context():
            db.create_all()
    return application


# Do not export `app` at module import. Gunicorn `backend.app:app` must bind
# the package (backend/app/__init__.py) which uses FLASK_ENV=production.
# A module-level app here would shadow that with DevelopmentConfig.

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app = create_app(DevelopmentConfig)
    app.run(host="0.0.0.0", port=port, debug=True)
