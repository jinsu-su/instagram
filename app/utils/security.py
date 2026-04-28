from datetime import datetime, timedelta
from typing import Optional
import jwt
import json
import base64
from cryptography.fernet import Fernet
from app.config import get_settings

settings = get_settings()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key.get_secret_value(), 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key.get_secret_value(), 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError:
        return None

def dumps_state(data: dict) -> str:
    """Serialize and sign a dict to a JWS (JWT)."""
    to_encode = data.copy()
    # Add a short expiration (10 minutes) for state tokens
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=10)})
    return jwt.encode(
        to_encode,
        settings.state_secret_key.get_secret_value(),
        algorithm="HS256"
    )

def loads_state(state: str) -> dict:
    """Verify and deserialize a JWS state string."""
    try:
        return jwt.decode(
            state,
            settings.state_secret_key.get_secret_value(),
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        logger.warning("OAuth state expired")
        raise ValueError("State expired")
    except jwt.PyJWTError:
        logger.warning("Invalid OAuth state signature")
        raise ValueError("Invalid state")

def encrypt_token(plain_text: str) -> str:
    """Encrypt a plain text string using Fernet (AES-128)."""
    if not plain_text:
        return None
    key = settings.token_encryption_key.get_secret_value().encode()
    f = Fernet(key)
    return f.encrypt(plain_text.encode()).decode()

from app.utils.logging import get_logger
logger = get_logger(__name__)

def decrypt_token(encrypted_text: str) -> str:
    """Decrypt a Fernet encrypted string."""
    if not encrypted_text:
        return None
    try:
        key = settings.token_encryption_key.get_secret_value().encode()
        f = Fernet(key)
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception as e:
        logger.error(f"Token decryption failed: {str(e)}")
        return None
