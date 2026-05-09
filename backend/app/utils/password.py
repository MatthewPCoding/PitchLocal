from app.core.security import validate_password_strength
from fastapi import HTTPException, status

def enforce_password_strength(password: str):
    errors = validate_password_strength(password)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"password_errors": errors}
        )
