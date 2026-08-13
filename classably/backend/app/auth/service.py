from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.repository import repository
from app.auth.security import security


class AuthService:

    def register(
        self,
        db: Session,
        full_name: str,
        email: str,
        password: str,
        role: str,
    ):

        existing = repository.get_by_email(
            db,
            email,
        )

        if existing:

            raise ValueError(
                "Email already registered."
            )

        user = User(

            full_name=full_name,

            email=email,

            hashed_password=security.hash_password(
                password
            ),

            role=role,

        )

        return repository.create(
            db,
            user,
        )

    def login(
        self,
        db: Session,
        email: str,
        password: str,
    ):

        user = repository.get_by_email(
            db,
            email,
        )

        if not user:

            return None

        if not security.verify_password(
            password,
            user.hashed_password,
        ):

            return None

        token = security.create_access_token(
            {
                "id": user.id,
                "email": user.email,
            }
        )

        return {

            "access_token": token,

            "token_type": "bearer",

        }


service = AuthService()