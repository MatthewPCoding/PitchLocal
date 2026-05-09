import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Pull DATABASE_URL from the environment so alembic.ini never needs secrets.
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Settings() validates all fields at import time. Stub non-DB fields so that
# alembic commands only require DATABASE_URL to be real.
os.environ.setdefault("SECRET_KEY",            "alembic-stub")
os.environ.setdefault("ANTHROPIC_API_KEY",     "alembic-stub")
os.environ.setdefault("GOOGLE_PLACES_API_KEY", "alembic-stub")
os.environ.setdefault("REDDIT_CLIENT_ID",      "alembic-stub")
os.environ.setdefault("REDDIT_CLIENT_SECRET",  "alembic-stub")
os.environ.setdefault("SMTP_USER",             "stub@example.com")
os.environ.setdefault("SMTP_PASSWORD",         "alembic-stub")

# Import Base and every model so autogenerate can see all tables.
from app.db.database import Base  # noqa: F401
import app.models.user          # noqa: F401
import app.models.business      # noqa: F401
import app.models.lead          # noqa: F401
import app.models.pitch         # noqa: F401
import app.models.pipeline      # noqa: F401
import app.models.notification  # noqa: F401
import app.models.monitor       # noqa: F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
