from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, JSON, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class CameraSource(Base):
    __tablename__ = "camera_sources"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)

    name = Column(String(100), nullable=False)  # e.g., "Board Camera", "Teacher Camera"
    camera_type = Column(String(50), default="webcam")  # esp32, webcam, usb, rtsp, ip
    stream_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    fps = Column(Integer, default=15)
    resolution = Column(String(20), default="1080p")
    created_at = Column(DateTime, default=datetime.utcnow)

    classroom = relationship("Classroom", back_populates="cameras")


class SmartDevice(Base):
    __tablename__ = "smart_devices"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)

    device_type = Column(String(50), nullable=False)  # light, fan, curtain, projector, smart_desk, emergency_button, door, wheelchair_ramp
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="online")  # online, offline, error
    state = Column(JSON, default=dict)  # e.g., {"power": true, "speed": 3, "brightness": 80}
    ip_address = Column(String(50), nullable=True)
    mac_address = Column(String(50), nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)

    classroom = relationship("Classroom", back_populates="devices")


class SensorMetric(Base):
    __tablename__ = "sensor_metrics"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)

    sensor_type = Column(String(50), nullable=False)  # temperature, humidity, noise_level, light_level, occupancy, air_quality
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class RaiseHandEvent(Base):
    __tablename__ = "raise_hand_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    question_text = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, acknowledged, resolved, dismissed
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    session = relationship("LectureSession", back_populates="raise_hand_events")
    student = relationship("Student", back_populates="raise_hand_events")


class QAItem(Base):
    __tablename__ = "qa_items"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    session = relationship("LectureSession", back_populates="qa_items")
    student = relationship("Student", back_populates="qa_items")
