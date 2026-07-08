"""
DB connection config — reads from .env or environment variables.
Constructs a psycopg2 DSN from POSTGRES_* vars if DATABASE_URL is not set.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_env_path)


def get_dsn() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    host     = os.environ.get("POSTGRES_HOST",     "localhost")
    port     = os.environ.get("POSTGRES_PORT",     "5432")
    db       = os.environ.get("POSTGRES_DB",       "plm")
    user     = os.environ.get("POSTGRES_USER",     "plm")
    password = os.environ.get("POSTGRES_PASSWORD", "")
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"
