from flask import Blueprint

trades_bp = Blueprint("trades", __name__, url_prefix="/api/trades")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
cycles_bp = Blueprint("cycles", __name__, url_prefix="/api/cycles")
metrics_bp = Blueprint("metrics", __name__, url_prefix="/api/metrics")
preferences_bp = Blueprint("preferences", __name__, url_prefix="/api/me/preferences")
account_bp = Blueprint("account", __name__, url_prefix="/api/me")
billing_bp = Blueprint("billing", __name__, url_prefix="/api/billing")
screen_bp = Blueprint("screen", __name__, url_prefix="/api/screen")

from backend.routes import trades, dashboard, cycles, metrics, preferences, account, billing, screen  # noqa: F401
