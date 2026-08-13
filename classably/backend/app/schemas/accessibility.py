from datetime import datetime
from pydantic import BaseModel


class AccessibilityEventCreate(BaseModel):
    student_id: int
    event_type: str
    value: dict


class AccessibilityEventResponse(BaseModel):
    id: int
    student_id: int
    event_type: str
    value: dict
    created_at: datetime

    class Config:
        from_attributes = True