from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class VoiceCommandLog(Base):
    __tablename__ = "voice_command_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)

    raw_text = Column(String(500), nullable=False)
    intent = Column(String(100), nullable=False)
    parameters = Column(JSON, default=dict)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
