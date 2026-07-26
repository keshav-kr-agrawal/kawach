"""
Shared Zoho Catalyst ZCQL/Datastore helpers. `db` (from app.database.get_db)
is a _CatalystDB wrapper exposing execute_query() (reads, via ZCQL) and
table() (writes, via the Datastore Table API) — see app/database.py's
docstring for why both exist on one object.

Every route was originally written against SQLAlchemy ORM models
(FIRRecord/PoliceStation/User/Offender/...) that no longer exist; this module
is the common translation layer so each route doesn't reinvent row-fetching,
date parsing, or audit logging.
"""
from datetime import date, datetime


def zcql_rows(db, table: str, query: str = None) -> list:
    """Run a ZCQL query and unwrap Catalyst's `{"<Table>": {...}}` row
    envelope into a flat list of dicts. Returns [] on any failure (no
    datastore locally, table not provisioned yet, bad query) so every
    caller degrades the same way instead of needing its own try/except."""
    if db is None:
        return []
    try:
        resp = db.execute_query(query or f"SELECT * FROM {table}")
        return [row[table] for row in (resp or []) if table in row]
    except Exception as e:
        print(f"[ZCQL] query failed for {table}: {e}")
        return []


def parse_date(value):
    """Catalyst returns date/datetime columns as ISO strings over the wire —
    normalize to a python date, tolerating already-parsed date/datetime too."""
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.date() if isinstance(value, datetime) else value
    try:
        return datetime.fromisoformat(str(value)[:19]).date()
    except (ValueError, TypeError):
        return None


def parse_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    try:
        return datetime.fromisoformat(str(value)[:19])
    except (ValueError, TypeError):
        return None


def insert_row(db, table: str, row: dict):
    """Write path — Catalyst's Table API, not ZCQL (ZCQL is read-only here).
    Returns the inserted row (with ROWID) or None if it fails/no datastore,
    so callers can log a warning instead of crashing a request over a
    non-critical audit/log write."""
    if db is None:
        return None
    try:
        return db.table(table).insert_row(row)
    except Exception as e:
        print(f"[ZCQL] insert into {table} failed: {e}")
        return None


def log_audit(db, username: str, role: str, action: str, details: dict = None, ip_address: str = "10.25.0.1"):
    """Best-effort audit trail write — never blocks or fails the request it's
    called from; a missed audit log entry is far less bad than a 500 on the
    actual user-facing action."""
    return insert_row(db, "AuditLog", {
        "timestamp": datetime.utcnow().isoformat(),
        "username": username,
        "role": role,
        "action": action,
        "details": details or {},
        "ip_address": ip_address,
    })
