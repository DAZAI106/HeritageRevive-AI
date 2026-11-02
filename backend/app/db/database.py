"""
HeritageAI — SQLite Database with async SQLAlchemy.
Stores restoration history, metadata, and quality metrics.
"""
import os
from datetime import datetime
from typing import Optional, AsyncGenerator

from sqlalchemy import String, Float, DateTime, Text, Integer, select, func, desc
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Build async DB URL
_raw_url = os.getenv("DATABASE_URL", "sqlite:///./heritageai.db")
if _raw_url.startswith("sqlite:///") and "aiosqlite" not in _raw_url:
    DATABASE_URL = _raw_url.replace("sqlite:///", "sqlite+aiosqlite:///")
else:
    DATABASE_URL = _raw_url

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class RestorationRecord(Base):
    """Stores every restoration attempt with full metadata."""
    __tablename__ = "restorations"

    id: Mapped[str]              = mapped_column(String,  primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    image_name: Mapped[str]      = mapped_column(String,  nullable=False)
    original_path: Mapped[str]   = mapped_column(String,  nullable=False)
    mask_path: Mapped[Optional[str]]   = mapped_column(String,  nullable=True)
    result_path: Mapped[Optional[str]] = mapped_column(String,  nullable=True)
    model_used: Mapped[str]      = mapped_column(String,  default="lama")
    damage_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    processing_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    psnr: Mapped[Optional[float]]  = mapped_column(Float, nullable=True)
    ssim: Mapped[Optional[float]]  = mapped_column(Float, nullable=True)
    status: Mapped[str]          = mapped_column(String,  default="pending")
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    restoration_type: Mapped[str] = mapped_column(String, default="general")
    prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
