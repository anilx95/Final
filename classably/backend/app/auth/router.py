from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.dependencies import require_admin
from app.auth.schemas import Token
from app.auth.schemas import UserCreate
from app.auth.schemas import UserLogin
from app.auth.schemas import UserResponse
from app.auth.service import auth_service
from app.core.database import get_db
from app.models.entities.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):

    try:

        return auth_service.register(
            db=db,
            full_name=user.full_name,
            email=user.email,
            password=user.password,
            role=user.role,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/login",
    response_model=Token,
)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):

    token = auth_service.login(
        db=db,
        email=credentials.email,
        password=credentials.password,
    )

    if token is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return token


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    current_user: User = Depends(get_current_user),
):

    return current_user


@router.get(
    "/admin",
)
def admin_dashboard(
    current_user: User = Depends(require_admin),
):

    return {
        "message": "Welcome Admin",
        "user": current_user.full_name,
    }