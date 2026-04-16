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

# Configure CORS
# In production, we strictly limit origins to the frontend URL to prevent CSRF and unauthorized API access.
# In development, we allow localhost for easier testing.
allowed_origins = [str(settings.frontend_base_url).rstrip("/")]
if settings.environment == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",  # Vite default
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Trusted Host Middleware: Prevents Host Header Injection attacks.
from fastapi.middleware.trustedhost import TrustedHostMiddleware
domain = str(settings.api_base_url).split("//")[-1].split("/")[0].split(":")[0]
allowed_hosts = [domain, "localhost", "127.0.0.1", "*.ngrok-free.app", "*.ngrok.app", "*.ngrok.dev"]
if ".cloudflare" in domain: # Allow cloudflare worker/pages domains
    allowed_hosts.append("*.pages.dev")
    allowed_hosts.append("*.workers.dev")

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=allowed_hosts
)

@app.middleware("http")
async def add_security_headers_and_log(request: Request, call_next):
    """
    Production Hardening: Add essential security headers to every response.
    - X-Frame-Options: Prevents Clickjacking
    - X-Content-Type-Options: Prevents MIME-sniffing
    - X-XSS-Protection: Legacy but helpful
    - Content-Security-Policy: Basics for API
    """
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    
    # Add Security Headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    logger.info(f"Response status: {response.status_code} for {request.url.path}")
    return response

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
    
    - 24시간마다 실행
    - 만료 10일 이내이거나 이미 만료된 토큰 자동 갱신 시도
    - 갱신 성공: 새 토큰 + 새 만료 시간 DB 저장
    - 갱신 실패(이미 만료): connection_status = DISCONNECTED 마킹 → 사용자 재로그인 필요
    """
    # 서버 시작 직후 1분 대기 (DB 연결 안정화)
    await asyncio.sleep(60)
    logger.info("🔑 Token refresh scheduler started.")

    while True:
        try:
            from sqlalchemy import select
            from app.models.instagram_account import InstagramAccount
            from app.database import AsyncSessionLocal
            from app.services.meta_oauth import MetaOAuthService
            from app.services.customer_service import CustomerService
            from app.config import get_settings

            _settings = get_settings()
            refresh_threshold = timedelta(days=10)  # 만료 10일 전부터 갱신
            now = datetime.utcnow()

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

                for account in accounts:
                    try:
                        token = account.access_token
                        if not token:
                            skipped += 1
                            continue

                        # 만료 시간 체크
                        needs_refresh = False
                        already_expired = False

                        if account.token_expires_at:
                            time_until_expiry = account.token_expires_at - now
                            if time_until_expiry.total_seconds() <= 0:
                                already_expired = True
                                needs_refresh = True
                                logger.warning(
                                    f"⚠️ Token already EXPIRED for customer {account.customer_id} "
                                    f"(expired: {account.token_expires_at})"
                                )
                            elif time_until_expiry <= refresh_threshold:
                                needs_refresh = True
                                logger.info(
                                    f"🔔 Token expiring soon for customer {account.customer_id} "
                                    f"(expires in: {time_until_expiry.days}일)"
                                )
                            else:
                                skipped += 1
                                continue
                        else:
                            # 만료 시간 미설정: 갱신 시도하여 만료 시간 확보
                            needs_refresh = True
                            logger.info(f"ℹ️ No expiry time set for customer {account.customer_id}, attempting refresh")

                        if needs_refresh:
                            if already_expired:
                                # 이미 만료: 갱신 불가, DISCONNECTED 마킹
                                logger.error(
                                    f"❌ Cannot refresh expired token for customer {account.customer_id}. "
                                    f"Marking as DISCONNECTED."
                                )
                                account.connection_status = "DISCONNECTED"
                                await db.commit()
                                failed += 1
                                continue

                            # 만료 전: 자동 갱신 시도
                            try:
                                oauth_service = MetaOAuthService.from_settings()
                                refresh_result = await oauth_service.auto_refresh_token(token)
                                
                                new_token = refresh_result.get("access_token")
                                expires_in = refresh_result.get("expires_in")  # seconds

                                if new_token:
                                    account.access_token = new_token
                                    if expires_in:
                                        account.token_expires_at = now + timedelta(seconds=int(expires_in))
                                    else:
                                        # 기본 60일 적용
                                        account.token_expires_at = now + timedelta(days=60)
                                    
                                    await db.commit()
                                    refreshed += 1
                                    logger.info(
                                        f"✅ Token refreshed for customer {account.customer_id} "
                                        f"(new expiry: {account.token_expires_at})"
                                    )
                                else:
                                    logger.error(f"❌ Refresh returned no token for customer {account.customer_id}")
                                    failed += 1

                            except Exception as refresh_err:
                                import httpx
                                is_client_error = False
                                
                                if isinstance(refresh_err, httpx.HTTPStatusError):
                                    status_code = refresh_err.response.status_code
                                    # 400번대 에러(만료, 권한 취소 등)인 경우에만 영구 연결 끊김 처리
                                    if 400 <= status_code < 500:
                                        is_client_error = True
                                        
                                if is_client_error:
                                    logger.error(
                                        f"❌ Token refresh permanently failed (HTTP Client Error) for customer {account.customer_id}. "
                                        f"Marking as DISCONNECTED. Error: {str(refresh_err)}"
                                    )
                                    account.connection_status = "DISCONNECTED"
                                    await db.commit()
                                else:
                                    # 네트워크 장애나 Meta 500 에러일 경우 다음 날 다시 시도하도록 유지
                                    logger.warning(
                                        f"⚠️ Token refresh temporarily failed (Network/Server Error) for customer {account.customer_id}. "
                                        f"Will retry next time. Error: {str(refresh_err)}"
                                    )
                                failed += 1

                    except Exception as account_err:
                        logger.error(f"Error processing account {account.customer_id}: {account_err}")
                        failed += 1

                logger.info(
                    f"🔑 Token refresh complete: "
                    f"✅ refreshed={refreshed}, ❌ failed/disconnected={failed}, ⏭️ skipped={skipped}"
                )

        except Exception as e:
            logger.error(f"Error in token refresh scheduler: {e}", exc_info=True)

        # 24시간마다 실행
        await asyncio.sleep(24 * 3600)


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
