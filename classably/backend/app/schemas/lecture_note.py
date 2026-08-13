from pydantic import BaseModel
from datetime import datetime


class LectureNoteCreate(BaseModel):

    content: str


class LectureNoteResponse(BaseModel):

    id: int
    content: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }