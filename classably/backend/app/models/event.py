from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from app.core.database import Base


class SystemEvent(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    classroom_id = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False, default=1.0)
    priority = Column(String(20), nullable=False, default="normal")
    source = Column(String(50), default="AI")
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# Alias Event for backwards compatibility
Event = SystemEvent