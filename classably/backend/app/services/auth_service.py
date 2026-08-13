from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.entities.user import User
from app.auth.security import hash_password, verify_password
from app.auth.token import create_access_token
from app.repositories.user_repository import get_user_by_email, create_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def login(db: Session, login_data: LoginRequest) -> TokenResponse:
        user = AuthService.authenticate_user(db, login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        token = create_access_token(
            {
                "sub": user.email,
                "role": user.role,
                "id": user.id,
                "full_name": user.full_name,
            }
        )

        return TokenResponse(
            access_token=token,
            user=UserOut.model_validate(user),
        )

    @staticmethod
    def get_current_user_profile(user: User) -> UserOut:
        return UserOut.model_validate(user)
