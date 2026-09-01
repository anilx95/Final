from typing import Optional, List
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: Optional[str] = None
    role: str = "student"  # admin, teacher, student
    college_name: Optional[str] = None
    phone: Optional[str] = None
    roll_number: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    disability_profiles: Optional[List[str]] = []


class RegisterWithOTPRequest(RegisterRequest):
    otp: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SendOTPRequest(BaseModel):
    email: str
    purpose: str = "register"  # "register", "login", or "reset_password"


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    purpose: str = "register"  # "register", "login", or "reset_password"


class OTPLoginRequest(BaseModel):
    email: str
    otp: str


class ResetPasswordWithOTPRequest(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: Optional[str] = None


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
