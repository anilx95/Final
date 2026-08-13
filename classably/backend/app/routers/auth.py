import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.security import hash_password, verify_password
from app.auth.token import create_access_token
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.audit_constants import AuditAction
from app.models.entities.user import User
from app.models.entities.student import Student
from app.models.entities.teacher import Teacher
from app.repositories.user_repository import get_user_by_email
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
    PasswordResetRequest,
    PasswordResetConfirm,
    ProfileUpdate,
)
from app.services.audit_service import AuditLogger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    normalized_role = request.role.lower().strip() if request.role else "student"
    if normalized_role not in ["student", "teacher", "admin"]:
        normalized_role = "student"

    email_clean = request.email.lower().strip()
    if "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    full_name_clean = request.full_name.strip()
    if not full_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty.",
        )

    password_clean = request.password
    if not password_clean or len(password_clean) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        )

    college_name_clean = request.college_name.strip() if request.college_name else ""
    if normalized_role in ["student", "teacher"] and not college_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="College / Institution Name is mandatory for registration.",
        )

    existing = get_user_by_email(db, email_clean)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please sign in instead.",
        )

    user = User(
        full_name=full_name_clean,
        email=email_clean,
        password_hash=hash_password(password_clean),
        role=normalized_role,
        college_name=college_name_clean or None,
        phone=request.phone,
    )
    db.add(user)
    db.flush()

    # Ensure Student/Teacher profiles exist in database
    if normalized_role == "student":
        student = Student(
            user_id=user.id,
            name=full_name_clean,
            college_name=college_name_clean or None,
            roll_number=request.roll_number or f"STU-{uuid.uuid4().hex[:6].upper()}",
            course_id=request.course_id,
            disability_profiles=request.disability_profiles or [],
        )
        db.add(student)

    elif normalized_role == "teacher":
        teacher = Teacher(
            user_id=user.id,
            name=full_name_clean,
            email=email_clean,
            employee_id=request.employee_id or f"EMP-{uuid.uuid4().hex[:6].upper()}",
            college_name=college_name_clean or None,
            department_id=request.department_id,
            phone=request.phone,
        )
        db.add(teacher)

    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": user.email, "role": user.role, "id": user.id, "full_name": user.full_name}
    )

    try:
        AuditLogger.log(
            db=db,
            user_id=user.id,
            action=AuditAction.REGISTER,
            module="auth",
        )
        db.commit()
    except Exception:
        db.rollback()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(
    http_request: Request,
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    email_clean = request.email.lower().strip()
    password_clean = request.password

    user = get_user_by_email(db, email_clean)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
        )

    if not verify_password(password_clean, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled. Please contact administrator.",
        )

    token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "id": user.id,
            "full_name": user.full_name,
        }
    )

    try:
        AuditLogger.log(
            db=db,
            user_id=user.id,
            action=AuditAction.LOGIN,
            module="auth",
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent"),
        )
        db.commit()
    except Exception:
        db.rollback()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    out = UserOut.model_validate(current_user)
    # Populate classroom_id from student profile if available
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        out.classroom_id = getattr(current_user.student, "classroom_id", 1) or 1
    return out


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    # If student, update preferences, classroom & disability profiles
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        if payload.full_name is not None:
            current_user.student.name = payload.full_name
        if payload.disability_profiles is not None:
            current_user.student.disability_profiles = payload.disability_profiles
        if payload.preferred_language is not None:
            current_user.student.preferred_language = payload.preferred_language
        if payload.classroom_id is not None:
            current_user.student.classroom_id = payload.classroom_id

    elif current_user.role == "teacher" and hasattr(current_user, "teacher") and current_user.teacher:
        if payload.full_name is not None:
            current_user.teacher.name = payload.full_name

    db.commit()
    db.refresh(current_user)

    out = UserOut.model_validate(current_user)
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        out.classroom_id = getattr(current_user.student, "classroom_id", 1) or 1
    return out


@router.post("/forgot-password")
def forgot_password(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email.lower().strip())
    if user:
        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        db.commit()
        return {
            "message": "Reset token generated successfully",
            "reset_token": reset_token,
        }
    return {
        "message": "If an account exists with that email, a reset link has been generated."
    }


@router.post("/reset-password")
def reset_password(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    db.commit()
    return {"message": "Password updated successfully"}