import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
    DATABASE_URL = os.getenv("DATABASE_URL", os.getenv("SUPABASE_POSTGRES_URL", ""))

    if DATABASE_URL and "postgres://" in DATABASE_URL:
        # Convert postgres:// to postgresql:// for SQLAlchemy
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL if DATABASE_URL else "sqlite:///cycleiq.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Supabase Auth (optional for API key auth)
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
