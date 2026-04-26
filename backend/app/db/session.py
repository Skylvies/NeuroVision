from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.database import Base
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _run_migrations(conn)


async def _run_migrations(conn):
    """Add new columns to existing tables (SQLite ALTER TABLE, idempotent)."""
    from sqlalchemy import text
    for sql in [
        "ALTER TABLE sessions ADD COLUMN user_id TEXT",
        "ALTER TABLE sessions ADD COLUMN thumbnail TEXT",
        "ALTER TABLE analysis_results ADD COLUMN condition_scores TEXT",
    ]:
        try:
            await conn.execute(text(sql))
        except Exception:
            pass  # column already exists


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
