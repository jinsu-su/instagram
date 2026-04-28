from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.staticfiles import StaticFiles
import os

from app.config import get_settings
from app.database import init_db
from app.routers import api_router
from app.utils.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

import asyncio
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db_session, AsyncSessionLocal
from app.services.subscription_service import SubscriptionService

settings = get_settings()

app = FastAPI(
    title="Instagram Auth Service",
    version="0.1.0",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
)

# --- Middleware Configuration ---

# 1. Prepare Configuration Variables
allowed_origins = [str(settings.frontend_base_url).rstrip("/")]

# Explicitly include all variants of the production domain for CORS robustness
production_variants = [
    "https://aidm.kr",
    "https://www.aidm.kr",
    "https://aidm-frontend.pages.dev",
]

for variant in production_variants:
    if variant not in allowed_origins:
        allowed_origins.append(variant)

# Always allow local development origins for ease of testing/debugging, 
# while keeping the production base URL as the primary origin.
allowed_origins.extend([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])


from fastapi.middleware.trustedhost import TrustedHostMiddleware
domain = str(settings.api_base_url).split("//")[-1].split("/")[0].split(":")[0]
allowed_hosts = [
    domain, "aidm.kr", "api.aidm.kr", "localhost", "127.0.0.1", 
    "localhost:8000", "127.0.0.1:8000"
]
if settings.environment == "development":
    # 로컬 개발 환경: ngrok 도메인 자동 허용 (운영 환경과 완전 분리)
    allowed_hosts.extend(["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"])
    logger.info(f"🛠️  개발 모드: ngrok 도메인 허용됨 ({domain})")
elif ".cloudflare" in domain:
    allowed_hosts.extend(["*.pages.dev", "*.workers.dev"])

# 2. Add Middlewares (ORDER MATTERS: Last added is outermost)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip logging for health checks or statics to keep logs clean
    if request.url.path in ["/health", "/metrics", "/favicon.ico"] or request.url.path.startswith("/static") or request.url.path.startswith("/uploads"):
        return await call_next(request)
        
    origin = request.headers.get("Origin")
    
    # PRODUCTION SECURITY: Do NOT log cookies or authorization headers
    logger.info(f"🚀 INCOMING: {request.method} {request.url.path} | Origin: {origin}")
    
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"❌ CRASH: {request.method} {request.url.path} - Error: {str(e)}")
        raise e
        
    process_time = (time.time() - start_time) * 1000
    
    logger.info(f"✅ COMPLETED: {request.method} {request.url.path} - Status: {response.status_code} ({process_time:.2f}ms)")
    return response

# Layer 3 (Innermost): Custom Security Headers & Logging
from starlette.middleware.base import BaseHTTPMiddleware
class SecurityHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            # logger.info(f"Response status: {response.status_code} for {request.url.path}")
            return response
        except Exception as e:
            logger.error(f"Middleware error: {str(e)}")
            raise e

app.add_middleware(SecurityHeaderMiddleware)

# Layer 2: TrustedHost (Prevents Host Header Injection)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=allowed_hosts
)

# Layer 1 (Outermost): CORS (Handles Preflight OPTIONS requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Layer 0 (Entry Point): ProxyHeaders (Detects HTTPS from X-Forwarded-Proto)
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=allowed_hosts)


app.include_router(api_router)

# Mount static files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


def get_cors_headers(request: Request):
    """Helper to get consistent CORS headers for exception responses."""
    origin = request.headers.get("origin")
    if origin in allowed_origins:
        cors_origin = origin
    else:
        # Fallback to primary production domain or first allowed
        cors_origin = allowed_origins[0]
        
    return {
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외 핸들러 - 보안이 강화된 CORS 헤더 및 상세 정보 제어"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=get_cors_headers(request),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """검증 예외 핸들러 - 보안이 강화된 CORS 헤더"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=get_cors_headers(request),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 핸들러 - 운영 환경에서 상세 스택트레이스 노출 방지"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # 보안: 운영 환경인 경우 상세 에러 대신 범용 메시지 출력
    detail = str(exc) if settings.environment == "development" else "내부 서버 오류가 발생했습니다."
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
        headers=get_cors_headers(request),
    )


# --- Background Schedulers (Multi-Worker Safe) ---
async def acquire_scheduler_lock(db: AsyncSession, task_name: str, interval_seconds: int) -> bool:
    """
    SaaS Stability: Prevents multiple workers from running the same background task simultaneously.
    Uses the database 'scheduler_locks' table to coordinate.
    """
    from app.models.scheduler_lock import SchedulerLock
    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    import os
    
    worker_id = os.getenv("HOSTNAME", "default_worker") # Cloud Run uses HOSTNAME
    now = datetime.utcnow()
    
    try:
        # 1. Check if the task was run recently
        stmt = select(SchedulerLock).where(SchedulerLock.task_name == task_name)
        result = await db.execute(stmt)
        lock = result.scalar_one_or_none()
        
        if lock and lock.last_run_at:
            # If the task ran successfully within the interval, don't run it again
            if (now - lock.last_run_at).total_seconds() < interval_seconds:
                return False
        
        # 2. Try to update or insert the lock (Atomic attempt)
        # Note: In production we use PostgreSQL, so we can use ON CONFLICT
        # For simplicity and cross-DB support, we'll use a transaction
        if lock:
            lock.last_run_at = now
            lock.worker_id = worker_id
        else:
            lock = SchedulerLock(task_name=task_name, last_run_at=now, worker_id=worker_id)
            db.add(lock)
            
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Error acquiring scheduler lock for {task_name}: {e}")
        await db.rollback()
        return False

async def subscription_scheduler():
    """백그라운드에서 주기적으로 구독 갱신 및 사용량 초기화를 수행합니다."""
    logger.info("Subscription scheduler task initialized.")
    # Wait 2 minutes after startup to avoid crowding the start-up phase
    await asyncio.sleep(120)
    
    interval = 12 * 3600
    while True:
        try:
            async with AsyncSessionLocal() as db:
                if await acquire_scheduler_lock(db, "subscription_renewal", interval):
                    logger.info("📍 [Scheduler] Running subscription renewal...")
                    service = SubscriptionService(db)
                    
                    # 1. 정기 결제 처리 (만료된 구독 자동 갱신)
                    renewal_results = await service.process_due_subscriptions()
                    logger.info(f"Subscription renewal results: {renewal_results}")
                else:
                    logger.debug("Subscription renewal skipped (already run by another worker).")
        except Exception as e:
            logger.error(f"Error in subscription scheduler: {e}", exc_info=True)
            
        await asyncio.sleep(600) # Check every 10 mins if it's time to run

async def token_refresh_scheduler():
    """Instagram 액세스 토큰 자동 갱신 스케줄러."""
    logger.info("Token refresh scheduler task initialized.")
    # Server start wait
    await asyncio.sleep(180)
    
    interval = 12 * 3600
    while True:
        try:
            async with AsyncSessionLocal() as db:
                if await acquire_scheduler_lock(db, "token_refresh", interval):
                    from app.models.instagram_account import InstagramAccount
                    from app.services.token_refresh_service import TokenRefreshService
                    from app.services.customer_service import CustomerService
                    from sqlalchemy import select

                    _settings = get_settings()
                    
                    # 1. 토큰이 있는 모든 계정 조회
                    stmt = select(InstagramAccount).where(
                        InstagramAccount.access_token.isnot(None),
                        InstagramAccount.connection_status == "CONNECTED"
                    )
                    result = await db.execute(stmt)
                    accounts = result.scalars().all()

                    logger.info(f"🔑 [Scheduler] Token refresh check: {len(accounts)} connected accounts")
                    
                    customer_service = CustomerService()
                    token_service = TokenRefreshService(settings=_settings, customer_service=customer_service)

                    refreshed = 0
                    failed = 0
                    skipped = 0

                    for account in accounts:
                        try:
                            original_token = account.access_token
                            new_token = await token_service.get_refreshed_token(db, account)
                            
                            if account.connection_status == "DISCONNECTED":
                                failed += 1
                            elif original_token != new_token and new_token:
                                refreshed += 1
                            else:
                                skipped += 1
                        except Exception as loop_e:
                            logger.error(f"Error checking token for account {account.id}: {loop_e}")
                            failed += 1

                    logger.info(
                        f"✅ Token refresh scheduler finished. "
                        f"refreshed={refreshed}, failed={failed}, skipped={skipped}"
                    )
                else:
                    logger.debug("Token refresh skipped (already run by another worker).")

        except Exception as e:
            logger.error(f"🚨 Token refresh scheduler crashed: {e}", exc_info=True)

        await asyncio.sleep(600) # Check every 10 mins


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting Instagram Auth Service in %s mode", settings.environment)
    
    # Standard SaaS Resilience: Initialize DB and Schedulers in background 
    # to avoid blocking the HTTP server during startup.
    async def background_init():
        try:
            await init_db()
            # 구독 스케줄러 시작
            asyncio.create_task(subscription_scheduler())
            # 토큰 자동 갱신 스케줄러 시작
            asyncio.create_task(token_refresh_scheduler())
            logger.info("✅ Database initialized and schedulers started in background.")
        except Exception as e:
            logger.error(f"❌ Critical error during background initialization: {e}")

    asyncio.create_task(background_init())


@app.get("/health", include_in_schema=False)
async def health_check():
    """Health check - returns status and ensures DB connectivity."""
    health_info = {"status": "ok"}
    
    # Deep health check: verify DB connectivity
    try:
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health_info["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check failed (DB): {e}")
        health_info["status"] = "unhealthy"
        health_info["database"] = "error"
        return JSONResponse(status_code=503, content=health_info)

    if settings.environment == "production":
        return health_info
        
    health_info.update({
        "service": "instagram-auth-service",
        "env": settings.environment,
        "time": datetime.utcnow().isoformat()
    })
    return health_info








# Trigger reload
