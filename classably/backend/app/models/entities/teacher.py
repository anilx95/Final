from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    college_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = Column(String, nullable=False, default="CSE")
    designation = Column(String, nullable=False, default="Assistant Professor")
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="teacher")
    classroom = relationship("Classroom", back_populates="teachers")
    department_rel = relationship("Department", back_populates="teachers")
    sections = relationship("Section", back_populates="teacher")
    lecture_sessions = relationship("LectureSession", back_populates="teacher")
    assignments = relationship("Assignment", back_populates="teacher")
    study_materials = relationship("StudyMaterial", back_populates="teacher")