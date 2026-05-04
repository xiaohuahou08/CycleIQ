from flask import Blueprint

trades_bp = Blueprint("trades", __name__, url_prefix="/api/trades")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
cycles_bp = Blueprint("cycles", __name__, url_prefix="/api/cycles")
metrics_bp = Blueprint("metrics", __name__, url_prefix="/api/metrics")

from backend.routes import trades, dashboard, cycles, metrics  # noqa: F401
