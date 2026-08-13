from typing import Optional, List
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "student"  # admin, teacher, student
    college_name: Optional[str] = None
    phone: Optional[str] = None
    roll_number: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    disability_profiles: Optional[List[str]] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    college_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    classroom_id: Optional[int] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = None
    disability_profiles: Optional[List[str]] = None
    classroom_id: Optional[int] = None