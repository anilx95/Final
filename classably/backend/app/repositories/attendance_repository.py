from sqlalchemy.orm import Session

from app.models.models import Attendance


def create_attendance(db: Session, attendance: Attendance):
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def get_all_attendance(db: Session):
    return db.query(Attendance).all()


def get_student_attendance(
    db: Session,
    student_id: int,
):
    return (
        db.query(Attendance)
        .filter(Attendance.student_id == student_id)
        .all()
    )


def get_classroom_attendance(
    db: Session,
    classroom_id: int,
):
    return (
        db.query(Attendance)
        .filter(Attendance.classroom_id == classroom_id)
        .all()
    )