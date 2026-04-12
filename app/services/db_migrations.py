from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncConnection


MigrationFn = Callable[[AsyncConnection], Awaitable[None]]


@dataclass(frozen=True)
class Migration:
    name: str
    upgrade: MigrationFn


async def _ensure_migration_table(conn: AsyncConnection) -> None:
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
            """
        )
    )


def sync_users_table_schema(sync_conn) -> None:
    inspector = inspect(sync_conn)
    try:
        column_info = {item["name"]: item for item in inspector.get_columns("users")}
    except Exception:
        return

    columns = set(column_info)
    dialect = sync_conn.dialect.name
    timestamp_type = "TIMESTAMPTZ" if dialect != "sqlite" else "TIMESTAMP"

    if dialect == "sqlite" and column_info.get("github_id") and not column_info["github_id"].get("nullable", True):
        sync_conn.execute(text("PRAGMA foreign_keys=OFF"))
        sync_conn.execute(
            text(
                """
                CREATE TABLE users_new (
                    id VARCHAR PRIMARY KEY,
                    github_id VARCHAR UNIQUE,
                    username VARCHAR NOT NULL,
                    email VARCHAR,
                    password_hash TEXT,
                    role VARCHAR(20) DEFAULT 'user' NOT NULL,
                    auth_provider VARCHAR(20) DEFAULT 'github' NOT NULL,
                    api_key TEXT,
                    avatar_url VARCHAR,
                    access_token VARCHAR NOT NULL,
                    session_token_hash VARCHAR(128),
                    is_disabled BOOLEAN DEFAULT FALSE NOT NULL,
                    last_login_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL
                )
                """
            )
        )
        sync_conn.execute(
            text(
                """
                INSERT INTO users_new (
                    id, github_id, username, email, password_hash, role, auth_provider,
                    api_key, avatar_url, access_token, session_token_hash, is_disabled,
                    last_login_at, created_at
                )
                SELECT
                    id,
                    CASE WHEN role = 'admin' THEN NULL ELSE github_id END,
                    username,
                    email,
                    CASE WHEN role = 'admin' THEN password_hash ELSE NULL END,
                    CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END,
                    CASE WHEN role = 'admin' THEN 'local' ELSE 'github' END,
                    api_key,
                    avatar_url,
                    COALESCE(access_token, ''),
                    session_token_hash,
                    COALESCE(is_disabled, 0),
                    last_login_at,
                    created_at
                FROM users
                """
            )
        )
        sync_conn.execute(text("DROP TABLE users"))
        sync_conn.execute(text("ALTER TABLE users_new RENAME TO users"))
        sync_conn.execute(text("PRAGMA foreign_keys=ON"))
        return

    additions: list[tuple[str, str]] = []

    if "password_hash" not in columns:
        additions.append(("password_hash", "TEXT"))
    if "role" not in columns:
        additions.append(("role", "VARCHAR(20) DEFAULT 'user'"))
    if "auth_provider" not in columns:
        additions.append(("auth_provider", "VARCHAR(20) DEFAULT 'github'"))
    if "github_id" not in columns:
        additions.append(("github_id", "TEXT"))
    if "api_key" not in columns:
        additions.append(("api_key", "TEXT"))
    if "access_token" not in columns:
        additions.append(("access_token", "TEXT"))
    if "session_token_hash" not in columns:
        additions.append(("session_token_hash", "VARCHAR(128)"))
    if "is_disabled" not in columns:
        additions.append(("is_disabled", "BOOLEAN DEFAULT FALSE"))
    if "last_login_at" not in columns:
        additions.append(("last_login_at", timestamp_type))

    for col_name, col_type in additions:
        sync_conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

    if any(name == "role" for name, _ in additions):
        sync_conn.execute(text("UPDATE users SET role='user' WHERE role IS NULL OR role=''"))

    if any(name == "auth_provider" for name, _ in additions):
        sync_conn.execute(
            text("UPDATE users SET auth_provider = CASE WHEN role = 'admin' THEN 'local' ELSE 'github' END")
        )

    sync_conn.execute(
        text("UPDATE users SET auth_provider = CASE WHEN role = 'admin' THEN 'local' ELSE COALESCE(NULLIF(auth_provider, ''), 'github') END")
    )
    sync_conn.execute(text("UPDATE users SET github_id = NULL WHERE role = 'admin'"))
    sync_conn.execute(text("UPDATE users SET password_hash = NULL WHERE role != 'admin'"))

    if any(name == "is_disabled" for name, _ in additions):
        if dialect == "sqlite":
            sync_conn.execute(text("UPDATE users SET is_disabled=0 WHERE is_disabled IS NULL"))
        else:
            sync_conn.execute(text("UPDATE users SET is_disabled=FALSE WHERE is_disabled IS NULL"))


async def _upgrade_users_schema(conn: AsyncConnection) -> None:
    await conn.run_sync(sync_users_table_schema)


async def _upgrade_indexes(conn: AsyncConnection) -> None:
    statements = [
        "CREATE INDEX IF NOT EXISTS idx_users_access_token ON users(access_token)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_users_session_token_hash ON users(session_token_hash)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON connected_repositories(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_api_keys_user_provider ON user_api_keys(user_id, provider)",
        "CREATE INDEX IF NOT EXISTS idx_webhook_events_repo_name ON webhook_events(repo_name)",
    ]

    for statement in statements:
        await conn.execute(text(statement))


async def _upgrade_neon_compat_tables(conn: AsyncConnection) -> None:
    dialect = conn.dialect.name
    bool_type = "BOOLEAN" if dialect != "sqlite" else "BOOLEAN"
    timestamp_type = "TIMESTAMPTZ" if dialect != "sqlite" else "TIMESTAMP"

    await conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS roles (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(32) UNIQUE NOT NULL,
                created_at {timestamp_type} DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
            """
        )
    )

    await conn.execute(
        text(
            """
            INSERT INTO roles (id, name)
            VALUES ('role_admin', 'admin'), ('role_user', 'user')
            ON CONFLICT (name) DO NOTHING
            """
        )
    )

    await conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS api_keys (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                provider VARCHAR(20) NOT NULL,
                encrypted_key TEXT,
                is_active {bool_type} DEFAULT FALSE NOT NULL,
                created_at {timestamp_type} DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
            """
        )
    )


MIGRATIONS: list[Migration] = [
    Migration(name="0001_users_schema_sync", upgrade=_upgrade_users_schema),
    Migration(name="0002_indexes", upgrade=_upgrade_indexes),
    Migration(name="0003_auth_provider_split", upgrade=_upgrade_users_schema),
    Migration(name="0004_neon_compat_tables", upgrade=_upgrade_neon_compat_tables),
]


async def apply_pending_migrations(conn: AsyncConnection) -> None:
    await _ensure_migration_table(conn)

    rows = await conn.execute(text("SELECT name FROM schema_migrations"))
    applied = {row[0] for row in rows.fetchall()}

    for migration in MIGRATIONS:
        if migration.name in applied:
            continue
        await migration.upgrade(conn)
        await conn.execute(
            text("INSERT INTO schema_migrations (name) VALUES (:name)"),
            {"name": migration.name},
        )
