from flask import Blueprint

trades_bp = Blueprint("trades", __name__, url_prefix="/api/trades")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
cycles_bp = Blueprint("cycles", __name__, url_prefix="/api/cycles")

from backend.routes import trades, dashboard, cycles
