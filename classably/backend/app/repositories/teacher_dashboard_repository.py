from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    Teacher,
    Student,
    Classroom,
    LectureSession,
    LectureNote,
)


def get_dashboard_summary(
    db: Session,
    teacher_id: int,
):
    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == teacher_id)
        .first()
    )

    if teacher is None:
        return None

    classroom = None

    if teacher.classroom_id:
        classroom = (
            db.query(Classroom)
            .filter(
                Classroom.id == teacher.classroom_id
            )
            .first()
        )

    active_session = (
        db.query(LectureSession)
        .filter(
            LectureSession.teacher_id == teacher.id,
            LectureSession.status == "ACTIVE",
        )
        .first()
    )

    total_students = (
        db.query(func.count(Student.id))
        .filter(
            Student.classroom_id == teacher.classroom_id
        )
        .scalar()
    )

    total_notes = (
        db.query(func.count(LectureNote.id))
        .scalar()
    )

    return {
        "teacher": teacher,
        "classroom": classroom,
        "active_session": active_session,
        "student_count": total_students,
        "notes_count": total_notes,
    }