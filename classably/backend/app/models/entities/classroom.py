from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Lab 101"
    code = Column(String(50), unique=True, index=True, nullable=True)

    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    building = Column(String, default="Main Block")
    floor_id = Column(Integer, ForeignKey("floors.id"), nullable=True)
    floor = Column(Integer, default=1)
    room_number = Column(String(20), nullable=True)

    capacity = Column(Integer, default=60)
    pos_x = Column(Float, default=0.0)
    pos_y = Column(Float, default=0.0)

    has_wheelchair_ramp = Column(Boolean, default=True)
    has_step_access_only = Column(Boolean, default=False)
    has_smart_board = Column(Boolean, default=True)
    has_audio_system = Column(Boolean, default=True)

    # Relationships
    floor_rel = relationship("Floor", back_populates="classrooms")
    students = relationship("Student", back_populates="classroom")
    teachers = relationship("Teacher", back_populates="classroom")
    sections = relationship("Section", back_populates="classroom")
    devices = relationship("SmartDevice", back_populates="classroom", cascade="all, delete-orphan")
    cameras = relationship("CameraSource", back_populates="classroom", cascade="all, delete-orphan")
    lecture_sessions = relationship("LectureSession", back_populates="classroom")