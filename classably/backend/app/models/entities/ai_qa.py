from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class AIQAMessage(Base):
    """Student AI Q&A messages — questions asked to AI during live lectures."""
    __tablename__ = "ai_qa_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    context_used = Column(Text, nullable=True)  # transcript snippet used as context
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="ai_qa_messages")
    student = relationship("Student", back_populates="ai_qa_messages")


class AILectureSummary(Base):
    """AI-generated lecture summaries with structured content."""
    __tablename__ = "ai_lecture_summaries"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False, unique=True)

    summary_text = Column(Text, nullable=False)
    key_points = Column(JSON, default=list)
    definitions = Column(JSON, default=list)
    formulas = Column(JSON, default=list)
    style = Column(String(50), default="detailed")  # concise, detailed, study_notes, bullet_points
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="ai_summary")
