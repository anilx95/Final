from .user import User
from .academic import Department, Course, AcademicYear, Subject, Building
from .classroom import Classroom
from .teacher import Teacher
from .student import Student
from .assignments import Assignment, AssignmentSubmission, StudyMaterial
from .lecture import LectureSession, LiveSubtitle, BoardSnapshot, LectureNote, LectureChapter, GeneratedQuestion, LectureRecording
from .smart_classroom import CameraSource, SmartDevice, SensorMetric, RaiseHandEvent, QAItem
from .connected_student import ConnectedStudent
from .ai_qa import AIQAMessage, AILectureSummary
from .attendance import Attendance

__all__ = [
    "User",
    "Department",
    "Course",
    "AcademicYear",
    "Subject",
    "Building",
    "Classroom",
    "Teacher",
    "Student",
    "Assignment",
    "AssignmentSubmission",
    "StudyMaterial",
    "LectureSession",
    "LiveSubtitle",
    "BoardSnapshot",
    "LectureNote",
    "LectureChapter",
    "GeneratedQuestion",
    "LectureRecording",
    "CameraSource",
    "SmartDevice",
    "SensorMetric",
    "RaiseHandEvent",
    "QAItem",
    "ConnectedStudent",
    "AIQAMessage",
    "AILectureSummary",
    "Attendance",
]