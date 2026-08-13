from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_teacher

from app.models.models import LectureNote
from app.models.schemas import NoteCreate

from app.services.summarizer import summarize_transcript

from app.services.audit_service import AuditLogger
from app.core.audit_constants import AuditAction

router = APIRouter(
    prefix="/api/notes",
    tags=["notes"],
)


@router.post("")
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher),
):

    result = summarize_transcript(
        payload.raw_transcript,
        payload.language,
    )

    note = LectureNote(
        classroom_id=payload.classroom_id,
        title=payload.title,
        raw_transcript=payload.raw_transcript,
        summary=result["summary"],
        key_points=result["key_points"],
        language=payload.language,
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    AuditLogger.log_lecture_created(
        db=db,
        user_id=current_user.id,
        entity_id=note.id,
        title=note.title,
    )

    db.commit()

    return note


@router.get("")
def list_notes(
    classroom_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(LectureNote)

    if classroom_id is not None:
        q = q.filter(
            LectureNote.classroom_id == classroom_id
        )

    return q.order_by(
        LectureNote.created_at.desc()
    ).all()


@router.get("/{note_id}")
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
):

    note = db.get(
        LectureNote,
        note_id,
    )

    if not note:
        raise HTTPException(
            404,
            "Note not found",
        )

    return note