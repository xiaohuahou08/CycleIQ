"""WSGI entry point for production (gunicorn).

Usage:
    gunicorn --bind 0.0.0.0:5000 backend.wsgi:app
"""

from backend.app import create_app

app = create_app()
