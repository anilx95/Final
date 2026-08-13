from pydantic import BaseModel
from datetime import datetime


class AttendanceCreate(BaseModel):
    student_id: int
    classroom_id: int
    marked_via: str = "manual"


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    classroom_id: int
    marked_via: str
    timestamp: datetime
    synced: bool

    class Config:
        from_attributes = True