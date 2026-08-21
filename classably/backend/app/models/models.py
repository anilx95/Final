"""
Central Models Registry for ClassAbly Platform
Imports and exposes all database entity models.
"""

from app.core.database import Base

# Entities
from app.models.entities.user import User, EmailOTP
from app.models.entities.academic import (
    Department, Course, AcademicYear, Semester, Subject, Section, Building, Floor, TimetableSlot
)
from app.models.entities.classroom import Classroom
from app.models.entities.student import Student
from app.models.entities.teacher import Teacher
from app.models.entities.lecture import (
    LectureSession, LiveSubtitle, BoardSnapshot, LectureNote, LectureChapter,
    GeneratedQuestion, LectureRecording
)
from app.models.entities.assignments import (
    Assignment, AssignmentSubmission, StudyMaterial
)
from app.models.entities.smart_classroom import (
    CameraSource, SmartDevice, SensorMetric, RaiseHandEvent, QAItem
)
from app.models.entities.accessibility import (
    AccessibilityRequest, AccessibilityProfileEvent
)
from app.models.entities.attendance import Attendance
from app.models.notification import Notification
from app.models.event import SystemEvent
from app.models.entities.voice import VoiceCommandLog
from app.models.audit_log import AuditLog
from app.models.entities.ai_qa import AIQAMessage, AILectureSummary
from app.models.entities.connected_student import ConnectedStudent

__all__ = [
    "Base", "User", "EmailOTP", "Department", "Course", "AcademicYear", "Semester",
    "Subject", "Section", "Building", "Floor", "Classroom", "Student", "Teacher",
    "LectureSession", "LiveSubtitle", "BoardSnapshot", "LectureNote",
    "LectureChapter", "GeneratedQuestion", "LectureRecording", "Assignment",
    "AssignmentSubmission", "StudyMaterial", "CameraSource", "SmartDevice",
    "SensorMetric", "RaiseHandEvent", "QAItem", "AccessibilityRequest",
    "AccessibilityProfileEvent", "Attendance", "Notification", "SystemEvent",
    "VoiceCommandLog", "AuditLog", "AIQAMessage", "AILectureSummary",
    "ConnectedStudent", "TimetableSlot"
]