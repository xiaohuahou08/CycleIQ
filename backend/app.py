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


app = create_app(DevelopmentConfig)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
