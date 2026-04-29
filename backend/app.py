import os
from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

from backend.config import Config
from backend.models import db
from backend.routes import trades_bp, dashboard_bp, cycles_bp, metrics_bp
from backend.routes.trades import register_trades_routes
from backend.routes.dashboard import register_dashboard_routes
from backend.routes.cycles import register_cycles_routes
from backend.routes.metrics import register_metrics_routes

migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()

    # Register routes
    register_trades_routes(trades_bp)
    register_dashboard_routes(dashboard_bp)
    register_cycles_routes(cycles_bp)
    register_metrics_routes(metrics_bp)
    app.register_blueprint(trades_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(cycles_bp)
    app.register_blueprint(metrics_bp)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
