from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

from app.core.config import settings
from app.core.database import Base

# ==========================================================
# Import ALL SQLAlchemy models here
# ==========================================================

from app.models.entities.user import User
from app.models.entities.session import Session
from app.models.entities.analytics import Analytics
from app.models.entities.timeline import TimelineEvent
from app.models.entities.ai_result import AIResult

# If you have additional ORM models inside app.models.models
from app.models.models import *

# ==========================================================

config = context.config

# Read DATABASE_URL from application settings
config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("%", "%%"),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLAlchemy metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in online mode.
    """

    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()