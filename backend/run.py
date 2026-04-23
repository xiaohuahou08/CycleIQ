"""Application entry point for development.

Run with:
    FLASK_ENV=development flask run
or:
    python run.py
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
