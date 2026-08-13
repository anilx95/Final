from app.models.models import LectureNote

from app.repositories.lecture_note_repository import (
    create_note,
    get_notes,
    get_classroom_notes,
)

from app.repositories.lecture_session_repository import (
    lecture_session_repository,
)

from app.services.audit_service import AuditLogger
from app.services.notification_service import (
    create_system_notification,
)

print("Loaded service:", __file__)


def summarize(text: str):

    sentences = text.split(".")

    summary = ".".join(sentences[:3])

    key_points = [
        s.strip()
        for s in sentences[:5]
        if s.strip()
    ]

    return summary, key_points


def add_note(
    db,
    data,
    current_user,
):
    print("add_note() is executing")

    summary, key_points = summarize(
        data.raw_transcript
    )

    # ----------------------------------------
    # Find Active Lecture Session
    # ----------------------------------------
    active_session = lecture_session_repository.get_active_session(
        db=db,
        classroom_id=data.classroom_id,
    )

    note = LectureNote(
        classroom_id=data.classroom_id,
        session_id=active_session.id if active_session else None,
        title=data.title,
        raw_transcript=data.raw_transcript,
        summary=summary,
        key_points=key_points,
        language=data.language,
    )

    note = create_note(
        db,
        note,
    )

    print("=" * 60)
    print("Lecture Note Created")
    print("Teacher ID :", current_user.id)
    print("Lecture ID :", note.id)

    if active_session:
        print("Session ID :", active_session.id)

    print("Title      :", note.title)
    print("=" * 60)

    # ==========================
    # Audit Log
    # ==========================
    AuditLogger.log_lecture_created(
        db=db,
        user_id=current_user.id,
        entity_id=note.id,
        title=note.title,
    )

    # ==========================
    # Notification
    # ==========================
    create_system_notification(
        db=db,
        user_id=current_user.id,
        title="Lecture Note Created",
        message=f'"{note.title}" has been created successfully.',
        notification_type="lecture_note",
    )

    print("Audit log added")
    print("Notification created")

    return note


def list_notes(db):
    return get_notes(db)


def classroom_notes(
    db,
    classroom_id,
):
    return get_classroom_notes(
        db,
        classroom_id,
    )


def save_ai_note(
    db,
    classroom_id: int,
    transcript: str,
):
    """
    Save lecture notes generated automatically by the AI OCR pipeline.
    """

    transcript = transcript.strip()

    if not transcript:
        return None

    summary, key_points = summarize(transcript)

    # ----------------------------------------
    # Find Active Lecture Session
    # ----------------------------------------
    active_session = lecture_session_repository.get_active_session(
        db=db,
        classroom_id=classroom_id,
    )

    note = LectureNote(
        classroom_id=classroom_id,
        session_id=active_session.id if active_session else None,
        title="Live Classroom Notes",
        raw_transcript=transcript,
        summary=summary,
        key_points=key_points,
        language="English",
    )

    note = create_note(
        db=db,
        note=note,
    )

    print("=" * 60)
    print("AI LECTURE NOTE SAVED")

    if active_session:
        print("Session ID :", active_session.id)
    else:
        print("Session ID : None (No Active Session)")

    print("Lecture ID :", note.id)
    print("=" * 60)

    return note