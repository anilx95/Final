from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    name = Column(String, nullable=False)
    college_name = Column(String, nullable=True)
    roll_number = Column(String, unique=True, index=True, nullable=False)

    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    # Multi-disability profiles stored as JSON array:
    # ["visual_blind", "visual_low_vision", "color_blindness", "hearing", "speech", "motor", "dyslexia", "language_barrier", "learning_disability"]
    disability_profiles = Column(JSON, default=list)

    rfid_tag = Column(String, unique=True, nullable=True)
    ble_beacon_id = Column(String, unique=True, nullable=True)

    preferred_font_scale = Column(Float, default=1.0)
    preferred_theme = Column(String, default="default")  # default, high_contrast_dark, high_contrast_yellow, dyslexia_mode
    preferred_language = Column(String(10), default="en")
    voice_only_mode = Column(Boolean, default=False)
    screen_reader_enabled = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student")
    classroom = relationship("Classroom", back_populates="students")
    course_rel = relationship("Course", back_populates="students")
    submissions = relationship("AssignmentSubmission", back_populates="student")
    raise_hand_events = relationship("RaiseHandEvent", back_populates="student")
    qa_items = relationship("QAItem", back_populates="student")
    ai_qa_messages = relationship("AIQAMessage", back_populates="student")
    connected_sessions = relationship("ConnectedStudent", back_populates="student")