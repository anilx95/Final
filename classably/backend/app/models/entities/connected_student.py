from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConnectedStudent(Base):
    """Tracks students currently connected to a live lecture session."""
    __tablename__ = "connected_students"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    peer_id = Column(String(100), nullable=True)  # WebRTC peer ID
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    is_kicked = Column(Boolean, default=False)
    kicked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    session = relationship("LectureSession", back_populates="connected_students")
    student = relationship("Student", back_populates="connected_sessions")
