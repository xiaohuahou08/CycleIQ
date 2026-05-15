from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import models for metadata registration (create_all / migrations)
from backend.models.trade import Trade  # noqa: E402, F401
from backend.models.wheel_cycle import WheelCycle  # noqa: E402, F401
