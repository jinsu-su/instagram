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
from datetime import datetime, time, timedelta
from app.database import get_db_session
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
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])


from fastapi.middleware.trustedhost import TrustedHostMiddleware
domain = str(settings.api_base_url).split("//")[-1].split("/")[0].split(":")[0]
allowed_hosts = [
    "*", # Allow all hosts temporarily to debug connection issues
    domain, "aidm.kr", "*.a.run.app", "localhost", "127.0.0.1", 
    "localhost:8000", "127.0.0.1:8000", "*.ngrok-free.app", "*.ngrok.app"
]
if ".cloudflare" in domain:
    allowed_hosts.extend(["*.pages.dev", "*.workers.dev"])

# 2. Add Middlewares (ORDER MATTERS: Last added is outermost)

# Layer 3 (Innermost): Custom Security Headers & Logging
from starlette.middleware.base import BaseHTTPMiddleware
class SecurityHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming request: {request.method} {request.url.path}")
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
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


app.include_router(api_router)

# Mount static files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외 핸들러 - 보안이 강화된 CORS 헤더 및 상세 정보 제어"""
    origin = request.headers.get("origin")
    cors_origin = origin if origin in allowed_origins else allowed_origins[0]
    
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """검증 예외 핸들러 - 보안이 강화된 CORS 헤더"""
    origin = request.headers.get("origin")
    cors_origin = origin if origin in allowed_origins else allowed_origins[0]
    
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
    return response


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 핸들러 - 운영 환경에서 상세 스택트레이스 노출 방지"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    origin = request.headers.get("origin")
    cors_origin = origin if origin in allowed_origins else allowed_origins[0]
    
    # 보안: 운영 환경인 경우 상세 에러 대신 범용 메시지 출력
    detail = str(exc) if settings.environment == "development" else "내부 서버 오류가 발생했습니다."
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
    return response


async def subscription_scheduler():
    """백그라운드에서 주기적으로 구독 갱신 및 사용량 초기화를 수행합니다."""
    logger.info("Subscription scheduler started.")
    while True:
        try:
            async for db in get_db_session():
                service = SubscriptionService(db)
                
                # 1. 정기 결제 처리 (만료된 구독 자동 갱신)
                logger.info("Running periodic subscription renewal check...")
                renewal_results = await service.process_due_subscriptions()
                logger.info(f"Subscription renewal results: {renewal_results}")
                
                # 2. 월간 사용량 초기화 체크 (매월 1일)
                now = datetime.utcnow()
                if now.day == 1 and now.hour < 12:
                    logger.info("First day of the month detected. Usage reset logic can be triggered here.")
                
                break # 한 번 처리 후 세션 종료
        except Exception as e:
            logger.error(f"Error in subscription scheduler: {e}", exc_info=True)
            
        # 12시간마다 실행
        await asyncio.sleep(12 * 3600)


async def token_refresh_scheduler():
    """Instagram 액세스 토큰 자동 갱신 스케줄러.
    
    - 12시간마다 실행되도록 주기를 변경 (기존 24시간)
    - TokenRefreshService에 모든 복잡한 갱신 판단을 위임
    """
    # 서버 시작 직후 1분 대기 (DB 연결 안정화)
    await asyncio.sleep(60)
    logger.info("🔑 Token refresh scheduler started.")

    while True:
        try:
            from sqlalchemy import select
            from app.models.instagram_account import InstagramAccount
            from app.database import AsyncSessionLocal
            from app.services.token_refresh_service import TokenRefreshService
            from app.services.customer_service import CustomerService
            from app.config import get_settings

            _settings = get_settings()

            async with AsyncSessionLocal() as db:
                # 1. 토큰이 있는 모든 계정 조회
                stmt = select(InstagramAccount).where(
                    InstagramAccount.access_token.isnot(None),
                    InstagramAccount.connection_status == "CONNECTED"
                )
                result = await db.execute(stmt)
                accounts = result.scalars().all()

                logger.info(f"🔑 Token refresh check: {len(accounts)} connected accounts")
                refreshed = 0
                failed = 0
                skipped = 0

                # TokenRefreshService 인스턴스화
                customer_service = CustomerService()
                token_service = TokenRefreshService(settings=_settings, customer_service=customer_service)

                for account in accounts:
                    try:
                        # get_refreshed_token 내부에서
                        # - 만료 기간 체크
                        # - 토큰 타입에 따른 FB/IG API 선택
                        # - 만료 일자 갱신
                        # - 에러 시 DISCONNECTED 마킹 등 모든 처리를 캡슐화
                        
                        original_token = account.access_token
                        new_token = await token_service.get_refreshed_token(db, account)
                        
                        # connection_status가 TokenRefreshService 내에서 바뀌었을 수 있음
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
                    f"refreshed={refreshed}, failed/disconnected={failed}, skipped={skipped}"
                )

        except Exception as e:
            logger.error(f"🚨 Token refresh scheduler crashed: {e}", exc_info=True)

        # 12시간 대기
        await asyncio.sleep(12 * 3600)


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting Instagram Auth Service in %s mode", settings.environment)
    await init_db()
    
    # 구독 스케줄러 시작
    asyncio.create_task(subscription_scheduler())
    
    # 토큰 자동 갱신 스케줄러 시작
    asyncio.create_task(token_refresh_scheduler())
    logger.info("✅ Token auto-refresh scheduler started (runs every 24h)")


@app.get("/health", include_in_schema=False)
async def health_check():
    """Health check - returns minimal info in production."""
    if settings.environment == "production":
        return {"status": "ok"}
    return {"status": "ok", "service": "instagram-auth-service", "env": settings.environment}








# Trigger reload
