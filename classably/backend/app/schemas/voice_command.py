from datetime import datetime
from pydantic import BaseModel


class VoiceCommandCreate(BaseModel):
    student_id: int
    raw_text: str


class VoiceCommandResponse(BaseModel):
    id: int
    student_id: int
    raw_text: str
    intent: str
    parameters: dict
    success: bool
    created_at: datetime

    class Config:
        from_attributes = True