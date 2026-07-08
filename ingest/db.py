"""Thin DB helpers shared by all ingest scripts."""
import psycopg2
import psycopg2.extras
from .config import get_dsn


def get_conn():
    return psycopg2.connect(get_dsn())


def write_sync_log(conn, source_file: str, rows_added: int, rows_updated: int,
                   rows_skipped: int, notes: str | None = None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sync_log (source_file, rows_added, rows_updated, rows_skipped, notes)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (source_file, rows_added, rows_updated, rows_skipped, notes),
        )
    conn.commit()
