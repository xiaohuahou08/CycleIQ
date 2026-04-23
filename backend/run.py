"""Application entry point for development.

Run with:
    FLASK_ENV=development flask run
or:
    python run.py
"""

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    app.run(debug=debug)
