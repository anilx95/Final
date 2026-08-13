from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class TeacherCreate(BaseModel):
    name: str
    employee_id: str
    email: EmailStr
    phone: Optional[str] = None
    department: str = "CSE"
    designation: str = "Assistant Professor"
    classroom_id: int | None = None


class TeacherResponse(TeacherCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    classroom_id: Optional[int] = None