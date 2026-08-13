from sqlalchemy.orm import Session

from app.models.models import LectureNote


def create_note(
    db: Session,
    note: LectureNote,
):
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def get_notes(
    db: Session,
):
    return (
        db.query(LectureNote)
        .order_by(LectureNote.created_at.desc())
        .all()
    )


def get_classroom_notes(
    db: Session,
    classroom_id: int,
):
    return (
        db.query(LectureNote)
        .filter(
            LectureNote.classroom_id == classroom_id
        )
        .order_by(LectureNote.created_at.desc())
        .all()
    )


def get_session_notes(
    db: Session,
    session_id: int,
):
    return (
        db.query(LectureNote)
        .filter(
            LectureNote.session_id == session_id
        )
        .order_by(LectureNote.created_at.asc())
        .all()
    )