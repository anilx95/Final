from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=True)

    status = Column(String(20), default="present")  # present, absent, late
    marked_via = Column(String(50), default="rfid")  # rfid, ble, face_recognition, manual
    timestamp = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=True)

    student = relationship("Student")
    classroom = relationship("Classroom")
