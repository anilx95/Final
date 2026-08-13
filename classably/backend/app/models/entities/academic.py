from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    head_of_department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    teachers = relationship("Teacher", back_populates="department_rel")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    duration_years = Column(Integer, default=4)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="courses")
    subjects = relationship("Subject", back_populates="course", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="course_rel")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    year_label = Column(String(50), nullable=False)  # e.g., "2025-2026"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=True)

    semesters = relationship("Semester", back_populates="academic_year", cascade="all, delete-orphan")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    semester_number = Column(Integer, nullable=False)  # 1 to 8
    name = Column(String(50), nullable=False)  # e.g., "Fall Semester 2025"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    academic_year = relationship("AcademicYear", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    code = Column(String(20), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, default=3)
    description = Column(Text, nullable=True)

    course = relationship("Course", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    sections = relationship("Section", back_populates="subject", cascade="all, delete-orphan")
    lecture_sessions = relationship("LectureSession", back_populates="subject_rel")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    name = Column(String(20), nullable=False)  # e.g., "Section A"

    subject = relationship("Subject", back_populates="sections")
    classroom = relationship("Classroom", back_populates="sections")
    teacher = relationship("Teacher", back_populates="sections")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, index=True)
    total_floors = Column(Integer, default=4)
    has_elevator = Column(Boolean, default=True)
    has_wheelchair_ramps = Column(Boolean, default=True)

    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    floor_number = Column(Integer, nullable=False)
    name = Column(String(50), nullable=False)

    building = relationship("Building", back_populates="floors")
    classrooms = relationship("Classroom", back_populates="floor_rel")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    subject_code = Column(String(20), nullable=False, default="SUB101")
    subject_name = Column(String(100), nullable=False)
    topic = Column(String(255), nullable=True)
    section = Column(String(20), default="Sec-A")
    teacher_name = Column(String(100), nullable=True)
    classroom_name = Column(String(100), default="Smart Room 101")
    time_slot = Column(String(50), nullable=False)  # e.g., "09:00 AM - 10:00 AM"
    day = Column(String(20), default="Today")
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Teacher")
    classroom = relationship("Classroom")

