from datetime import datetime

from pydantic import BaseModel


class EventBase(BaseModel):

    event_type: str

    classroom_id: int

    confidence: float

    priority: str

    source: str

    payload: dict


class EventCreate(EventBase):

    pass


class EventResponse(EventBase):

    id: int

    created_at: datetime

    class Config:

        from_attributes = True