from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    Student,
    Teacher,
    Classroom,
    Attendance,
    SmartDevice,
    VoiceCommandLog,
    LectureNote,
    AccessibilityProfileEvent,
)


class DashboardService:
    """
    Dashboard business logic.

    Routers should never directly query the database.
    They should only call these service methods.
    """

    @staticmethod
    def get_overview(db: Session):
        today = date.today()

        total_students = (
            db.query(func.count(Student.id))
            .scalar()
            or 0
        )

        total_teachers = (
            db.query(func.count(Teacher.id))
            .scalar()
            or 0
        )

        total_classrooms = (
            db.query(func.count(Classroom.id))
            .scalar()
            or 0
        )

        total_devices = (
            db.query(func.count(SmartDevice.id))
            .scalar()
            or 0
        )

        attendance_today = (
            db.query(func.count(Attendance.id))
            .filter(func.date(Attendance.timestamp) == today)
            .scalar()
            or 0
        )

        lecture_notes_today = (
            db.query(func.count(LectureNote.id))
            .filter(func.date(LectureNote.created_at) == today)
            .scalar()
            or 0
        )

        voice_commands_today = (
            db.query(func.count(VoiceCommandLog.id))
            .filter(func.date(VoiceCommandLog.created_at) == today)
            .scalar()
            or 0
        )

        accessibility_events_today = (
            db.query(func.count(AccessibilityProfileEvent.id))
            .filter(func.date(AccessibilityProfileEvent.created_at) == today)
            .scalar()
            or 0
        )

        # Temporary until heartbeat system is added
        connected_devices = total_devices
        offline_devices = 0

        return {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_classrooms": total_classrooms,
            "total_devices": total_devices,
            "attendance_today": attendance_today,
            "lecture_notes_today": lecture_notes_today,
            "voice_commands_today": voice_commands_today,
            "accessibility_events_today": accessibility_events_today,
            "connected_devices": connected_devices,
            "offline_devices": offline_devices,
        }

    @staticmethod
    def get_attendance(db: Session):
        today = date.today()

        total_students = (
            db.query(func.count(Student.id))
            .scalar()
            or 0
        )

        present = (
            db.query(func.count(Attendance.id))
            .filter(func.date(Attendance.timestamp) == today)
            .scalar()
            or 0
        )

        absent = max(total_students - present, 0)

        attendance_percentage = (
            round((present / total_students) * 100, 2)
            if total_students > 0
            else 0
        )

        return {
            "present": present,
            "absent": absent,
            "total": total_students,
            "attendance_percentage": attendance_percentage,
        }

    @staticmethod
    def get_voice(db: Session):
        today = date.today()

        total_commands = (
            db.query(func.count(VoiceCommandLog.id))
            .filter(func.date(VoiceCommandLog.created_at) == today)
            .scalar()
            or 0
        )

        successful_commands = (
            db.query(func.count(VoiceCommandLog.id))
            .filter(
                func.date(VoiceCommandLog.created_at) == today,
                VoiceCommandLog.success.is_(True),
            )
            .scalar()
            or 0
        )

        failed_commands = total_commands - successful_commands

        return {
            "total_commands": total_commands,
            "successful_commands": successful_commands,
            "failed_commands": failed_commands,
        }

    @staticmethod
    def get_devices(db: Session):
        total_devices = (
            db.query(func.count(SmartDevice.id))
            .scalar()
            or 0
        )

        # Temporary until heartbeat/last_seen is implemented
        online_devices = total_devices
        offline_devices = 0

        device_types = (
            db.query(
                SmartDevice.device_type,
                func.count(SmartDevice.id)
            )
            .group_by(SmartDevice.device_type)
            .all()
        )

        devices_by_type = {
            device_type: count
            for device_type, count in device_types
        }

        return {
            "total_devices": total_devices,
            "online_devices": online_devices,
            "offline_devices": offline_devices,
            "devices_by_type": devices_by_type,
        }

    @staticmethod
    def get_accessibility(db: Session):
        today = date.today()

        total_events = (
            db.query(func.count(AccessibilityProfileEvent.id))
            .filter(
                func.date(
                    AccessibilityProfileEvent.created_at
                ) == today
            )
            .scalar()
            or 0
        )

        voice_only_users = (
            db.query(func.count(Student.id))
            .filter(Student.voice_only_mode.is_(True))
            .scalar()
            or 0
        )

        large_font_users = (
            db.query(func.count(Student.id))
            .filter(Student.preferred_font_scale > 1.0)
            .scalar()
            or 0
        )

        high_contrast_users = (
            db.query(func.count(Student.id))
            .filter(
                Student.preferred_theme == "high_contrast"
            )
            .scalar()
            or 0
        )

        return {
            "total_events": total_events,
            "voice_only_users": voice_only_users,
            "large_font_users": large_font_users,
            "high_contrast_users": high_contrast_users,
        }

    @staticmethod
    def get_classroom_summary(db: Session):
        classrooms = db.query(Classroom).all()

        results = []

        for classroom in classrooms:

            student_count = (
                db.query(func.count(Student.id))
                .filter(Student.classroom_id == classroom.id)
                .scalar()
                or 0
            )

            teacher_count = (
                db.query(func.count(Teacher.id))
                .filter(Teacher.classroom_id == classroom.id)
                .scalar()
                or 0
            )

            device_count = (
                db.query(func.count(SmartDevice.id))
                .filter(SmartDevice.classroom_id == classroom.id)
                .scalar()
                or 0
            )

            results.append(
                {
                    "classroom_id": classroom.id,
                    "name": classroom.name,
                    "building": classroom.building,
                    "floor": classroom.floor,
                    "students": student_count,
                    "teachers": teacher_count,
                    "devices": device_count,
                }
            )

        return results