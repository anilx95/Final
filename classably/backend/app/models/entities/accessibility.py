from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class AccessibilityRequest(Base):
    __tablename__ = "accessibility_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    request_type = Column(String(50), default="general")  # wheelchair_assistance, tts_assistance, captioning, seating_adjustment, emergency
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, acknowledged, resolved, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    synced = Column(Boolean, default=True)


class AccessibilityProfileEvent(Base):
    __tablename__ = "accessibility_profile_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    event_type = Column(String(50), nullable=False)  # theme_change, font_scale_change, TTS_toggle, voice_command, language_change
    value = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
