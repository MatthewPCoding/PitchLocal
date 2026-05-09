from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
import re

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def validate_password_strength(password: str) -> list[str]:
    """Returns list of errors. Empty list = valid."""
    errors = []
    if len(password) < 8:
        errors.append("At least 8 characters required")
    if not re.search(r"[A-Z]", password):
        errors.append("At least one uppercase letter required")
    if not re.search(r"[a-z]", password):
        errors.append("At least one lowercase letter required")
    if not re.search(r"\d", password):
        errors.append("At least one number required")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("At least one special character required")
    return errors

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({**data, "exp": expire, "type": "refresh"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
