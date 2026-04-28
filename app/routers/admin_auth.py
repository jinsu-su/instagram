
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta
import traceback

from app.database import get_db
from app.models.customer import Customer
from app.services.email_service import EmailService
from app.utils.logging import get_logger
from app.utils.security import create_access_token, decode_access_token
from pydantic import BaseModel, EmailStr, Field
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.utils.rate_limiter import rate_limiter

router = APIRouter(prefix="/auth", tags=["Admin Auth"])
logger = get_logger(__name__)
import bcrypt
import hashlib

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., alias="confirmPassword")
    name: str

    model_config = {
        "populate_by_name": True
    }

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., alias="confirmPassword")

    model_config = {
        "populate_by_name": True
    }

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

@router.post("/signup")
async def signup(request: SignupRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    logger.info(f"🆕 Signup request received for: {request.email}")
    # Rate Limiting: 3 signups per hour per email to prevent spamming
    rl_key = f"signup:{request.email}"
    signup_rl = await rate_limiter.allow(rl_key, max_calls=3, window_seconds=3600)
    if not signup_rl.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
            headers={"Retry-After": str(int(signup_rl.retry_after_seconds))}
        )
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")
    
    logger.info("🔍 Checking existing user in DB...")
    # Check existing email
    result = await db.execute(select(Customer).where(Customer.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    # Create Customer
    logger.info("🔐 Hashing password...")
    hashed_pw = get_password_hash(request.password)
    
    logger.info("👤 Creating Customer object...")
    new_customer = Customer(
        name=request.name,
        email=request.email,
        hashed_password=hashed_pw,
        signup_source="email",
        is_verified=False,
        verification_token=secrets.token_urlsafe(32),
        terms_agreed_at=datetime.utcnow()
    )
    db.add(new_customer)
    logger.info("💾 Saving to database (commit)...")
    await db.commit()
    logger.info("✅ Database commit successful.")
    
    logger.info("🔄 Refreshing user data...")
    await db.refresh(new_customer)
    
    # Send Verification Email
    logger.info("📧 Preparing email service...")
    email_service = EmailService()
    
    logger.info("📮 Scheduling verification email in background...")
    background_tasks.add_task(email_service.send_verification_email, new_customer.email, new_customer.verification_token)
    
    logger.info("✨ Signup process finished. Sending response to client.")
    return {"message": "회원가입이 완료되었습니다. 이메일 인증을 진행해주세요."}

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Rate Limiting: 5 attempts per 5 minutes per email
    rl_key = f"login_attempt:{request.email}"
    minute_rl = await rate_limiter.allow(rl_key, max_calls=5, window_seconds=300)
    if not minute_rl.allowed:
        raise HTTPException(
            status_code=429,
            detail="로그인 시도 횟수를 초과했습니다. 5분 후에 다시 시도해주세요.",
            headers={"Retry-After": str(int(minute_rl.retry_after_seconds))}
        )
        
    result = await db.execute(select(Customer).where(Customer.email == request.email))
    customer = result.scalar_one_or_none()
    
    if not customer or not verify_password(request.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    
    if not customer.is_verified:
        raise HTTPException(status_code=403, detail="이메일 인증이 완료되지 않았습니다.")
    
    # Production-ready JWT Token
    access_token = create_access_token(data={"sub": str(customer.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "integration_status": customer.integration_status
        }
    }

from fastapi import Request
security_scheme = HTTPBearer(auto_error=False) 

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Customer:
    """
    Dependency to get the current authenticated user from JWT.
    Supports both Authorization header and 'access_token' cookie.
    """
    token = None
    
    # 1. Try to get token from 'access_token' cookie (Secure & HttpOnly)
    token = request.cookies.get("access_token")
    
    # 2. Try to get token from Authorization header if cookie is missing
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        logger.error("❌ get_current_user: No token found in cookie or header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요한 서비스입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        logger.info(f"🔑 get_current_user: Authenticating with token (first 10 chars): {token[:10]}...")
        
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            logger.error("❌ get_current_user: Invalid payload or signature")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 인증 토큰입니다. 다시 로그인해주세요.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload["sub"]
        logger.info(f"🔑 get_current_user: Looking up user_id: {user_id}")
        
        result = await db.execute(select(Customer).where(Customer.id == user_id))
        customer = result.scalar_one_or_none()
        
        if not customer:
            logger.error(f"❌ get_current_user: Customer {user_id} not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="사용자 계정을 찾을 수 없습니다.",
            )
        
        logger.info(f"✅ get_current_user: Authenticated {customer.email}")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ get_current_user Error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="인증 처리 중 오류가 발생했습니다.",
        )

@router.get("/verify")
async def verify_account(token: str, email: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    # First, try to find by token
    result = await db.execute(select(Customer).where(Customer.verification_token == token))
    customer = result.scalar_one_or_none()
    
    if not customer:
        # If token not found, maybe it was already used
        if email:
            result = await db.execute(select(Customer).where(Customer.email == email))
            existing_customer = result.scalar_one_or_none()
            if existing_customer and existing_customer.is_verified:
                return {"message": "이미 인증된 계정입니다.", "email": existing_customer.email}
        
        raise HTTPException(status_code=400, detail="유효하지 않거나 이미 사용된 인증 토큰입니다.")
    
    if customer.is_verified:
        return {"message": "이미 인증된 계정입니다.", "email": customer.email}

    customer.is_verified = True
    customer.verification_token = None
    await db.commit()
    
    return {"message": "계정이 인증되었습니다.", "email": customer.email}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Rate Limiting: 3 reset requests per hour per email
    rl_key = f"forgot_password:{request.email}"
    reset_rl = await rate_limiter.allow(rl_key, max_calls=3, window_seconds=3600)
    if not reset_rl.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="비밀번호 재설정 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
            headers={"Retry-After": str(int(reset_rl.retry_after_seconds))}
        )
    """
    Generate a reset token and send email.
    Security: Returns generic message even if email doesn't exist (anti-enumeration).
    """
    result = await db.execute(select(Customer).where(Customer.email == request.email))
    customer = result.scalar_one_or_none()
    
    # Generic success message for security
    success_msg = {"message": "입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다. (계정이 존재하는 경우)"}
    
    if not customer:
        logger.info(f"Forgot password requested for non-existent email: {request.email}")
        return success_msg

    # Generate secure random token
    raw_token = secrets.token_urlsafe(32)
    # Store SHA256 hash of raw_token
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    customer.reset_password_token = token_hash
    customer.reset_password_token_expires_at = datetime.utcnow() + timedelta(hours=1)
    
    await db.commit()
    
    # Send Email
    email_service = EmailService()
    background_tasks.add_task(email_service.send_password_reset_email, customer.email, raw_token)
    
    return success_msg

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset password using token.
    Security: Validates hashed token and expiry.
    """
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

    # Hash the provided raw token to compare with DB
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    
    result = await db.execute(
        select(Customer)
        .where(Customer.reset_password_token == token_hash)
        .where(Customer.reset_password_token_expires_at > datetime.utcnow())
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 토큰입니다.")
    
    # Update password and clear token
    customer.hashed_password = get_password_hash(request.password)
    customer.reset_password_token = None
    customer.reset_password_token_expires_at = None
    
    await db.commit()
    
    return {"message": "비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요."}
