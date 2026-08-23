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
        # Import all entity models so Base.metadata is fully populated
        import app.models.entities.user
        import app.models.entities.student
        import app.models.entities.teacher
        import app.models.entities.classroom
        import app.models.entities.academic
        import app.models.entities.smart_classroom
        import app.models.entities.lecture
        import app.models.entities.accessibility
        import app.models.entities.assignments
        import app.models.entities.attendance
        import app.models.entities.voice
        import app.models.entities.ai_qa
        import app.models.notification
        import app.models.audit_log
        import app.models.entities.connected_student

        # Ensure all tables are created
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        is_sqlite = engine.dialect.name == "sqlite"

        with engine.connect() as conn:
            for table in Base.metadata.sorted_tables:
                if table.name in existing_tables:
                    try:
                        existing_cols = [c["name"] for c in inspector.get_columns(table.name)]
                        for col in table.columns:
                            if col.name not in existing_cols:
                                col_type = col.type.compile(engine.dialect)
                                if is_sqlite:
                                    sql = f"ALTER TABLE {table.name} ADD COLUMN {col.name} {col_type};"
                                else:
                                    sql = f"ALTER TABLE {table.name} ADD COLUMN IF NOT EXISTS {col.name} {col_type};"
                                logger.info(f"Syncing missing column: {table.name}.{col.name}")
                                try:
                                    conn.execute(text(sql))
                                except Exception as col_err:
                                    logger.warning(f"Column add skipped ({table.name}.{col.name}): {col_err}")
                    except Exception as table_err:
                        logger.warning(f"Table inspection skipped ({table.name}): {table_err}")
            conn.commit()

        # Automatically seed production data if tables are empty
        try:
            from app.core.seed import seed_production_data
            with SessionLocal() as db_session:
                seed_production_data(db_session)
        except Exception as seed_err:
            logger.warning(f"Seeding warning: {seed_err}")

        # Ensure PostgreSQL auto-increment sequences are synchronized to max(id)
        if engine.dialect.name == "postgresql":
            with engine.connect() as conn:
                for table in Base.metadata.sorted_tables:
                    try:
                        conn.execute(
                            text(
                                f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), coalesce(max(id), 0) + 1, false) FROM {table.name};"
                            )
                        )
                    except Exception:
                        pass
                conn.commit()
    except Exception as e:
        logger.warning(f"Database schema sync warning: {e}")


# Initialize schema automatically
try:
    sync_db_schema()
except Exception as _init_err:
    pass