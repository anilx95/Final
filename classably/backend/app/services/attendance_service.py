from app.models.models import Attendance

from app.repositories.attendance_repository import (
    create_attendance,
    get_all_attendance,
    get_student_attendance,
    get_classroom_attendance,
)

from app.services.audit_service import AuditLogger
from app.core.audit_constants import AuditAction

from app.services.notification_service import (
    create_system_notification,
)


def mark_attendance(
    db,
    attendance,
    current_user,
):
    new_attendance = Attendance(
        student_id=attendance.student_id,
        classroom_id=attendance.classroom_id,
        marked_via=attendance.marked_via,
    )

    # ==================================
    # Save Attendance
    # ==================================
    new_attendance = create_attendance(
        db,
        new_attendance,
    )

    # ==================================
    # Audit Log
    # ==================================
    AuditLogger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ATTENDANCE_MARKED,
        module="attendance",
        entity_id=new_attendance.id,
        details={
            "student_id": new_attendance.student_id,
            "classroom_id": new_attendance.classroom_id,
            "marked_via": new_attendance.marked_via,
        },
    )

    # ==================================
    # Notification
    # ==================================
    create_system_notification(
        db=db,
        user_id=new_attendance.student_id,
        title="Attendance Recorded",
        message="Your attendance has been marked successfully.",
        notification_type="attendance",
    )

    return new_attendance


def list_attendance(db):
    return get_all_attendance(db)


def student_attendance(
    db,
    student_id,
):
    return get_student_attendance(
        db,
        student_id,
    )


def classroom_attendance(
    db,
    classroom_id,
):
    return get_classroom_attendance(
        db,
        classroom_id,
    )