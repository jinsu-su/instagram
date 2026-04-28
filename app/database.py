from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.models.base import Base

# Import all models to register them with Base
from app.models import Customer, OAuthAccount, InstagramAccount, Contact, Campaign, Flow, AutomationActivity, ProcessedWebhook
from app.models.broadcast_log import BroadcastLog
from app.models.subscription import Subscription, PaymentHistory # Registered
from app.models.ai_insight import AiInsight
from app.models.ai_performance_report import AIPerformanceReport
from app.models.post_analysis_cache import PostAnalysisCache  # 게시물 분석 캐시 모델
from app.models.chat import ChatSession, ChatMessage
from app.models.scheduler_lock import SchedulerLock

settings = get_settings()

engine = create_async_engine(
    str(settings.database_url),
    echo=False,
    future=True,
    # Production Hardening: Optimized for Supabase pooler (Session/Transaction mode)
    pool_size=5,              # Reduce from 10 to 5
    max_overflow=5,           # Reduce from 20 to 5
    pool_timeout=30,          # Wait 30s before failing if pool is full
    pool_recycle=1800,        # Recycle connections every 30 mins to avoid stale sessions
    pool_pre_ping=True,       # Check connection health before use
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncSession:
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Backwards compatibility: some modules import get_db
get_db = get_db_session


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

