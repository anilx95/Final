"""
Production Database Configuration

Current Database:
- PostgreSQL

Future Ready:
- Alembic
- Connection Pooling
- Docker
- SQLAlchemy 2.x
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------
# Engine Configuration
# ---------------------------------------------------------

engine_kwargs = {
    "pool_pre_ping": True,
    "future": True,
}

# PostgreSQL vs SQLite configuration options
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update(
        {
            "pool_recycle": 3600,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
        }
    )

# Engine
engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

# ---------------------------------------------------------
# Session Factory
# ---------------------------------------------------------

SessionLocal = sessionmaker(

    bind=engine,

    autoflush=False,

    autocommit=False,

    expire_on_commit=False,

)

# ---------------------------------------------------------
# Base Model
# ---------------------------------------------------------

Base = declarative_base()

# ---------------------------------------------------------
# Dependency
# ---------------------------------------------------------


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_db_schema():
    """
    Ensures all tables and missing columns exist in the database.
    """
    from sqlalchemy import inspect, text
    import logging

    logger = logging.getLogger("app.database")
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        with engine.connect() as conn:
            for table in Base.metadata.sorted_tables:
                if table.name in existing_tables:
                    existing_cols = [c["name"] for c in inspector.get_columns(table.name)]
                    for col in table.columns:
                        if col.name not in existing_cols:
                            col_type = col.type.compile(engine.dialect)
                            sql = f"ALTER TABLE {table.name} ADD COLUMN IF NOT EXISTS {col.name} {col_type};"
                            logger.info(f"Syncing missing column: {table.name}.{col.name}")
                            conn.execute(text(sql))
            conn.commit()
        Base.metadata.create_all(bind=engine)

        # Automatically seed production data if tables are empty
        try:
            from app.core.seed import seed_production_data
            with SessionLocal() as db_session:
                seed_production_data(db_session)
        except Exception as seed_err:
            logger.warning(f"Seeding warning: {seed_err}")
    except Exception as e:
        logger.warning(f"Database schema sync warning: {e}")