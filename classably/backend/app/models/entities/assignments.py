from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    due_date = Column(DateTime, nullable=False)
    max_marks = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Teacher", back_populates="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    file_path = Column(String(500), nullable=True)
    submission_text = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    marks_obtained = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String(20), default="submitted")  # submitted, graded, late

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf")  # pdf, docx, pptx, mp4, mp3
    language = Column(String(20), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Teacher", back_populates="study_materials")
