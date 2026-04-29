"""WSGI entry point for production (gunicorn)."""

try:
    # Production/Docker path
    from backend.app import app
except ModuleNotFoundError:
    # Local CLI path when running from backend/ directory
    from app import app
