from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_teacher

from app.schemas.lecture_note import (
    LectureNoteCreate,
    LectureNoteResponse,
)

from app.services.lecture_note_service import (
    add_note,
    list_notes,
    classroom_notes,
)

print("Loaded router:", __file__)

router = APIRouter(
    prefix="/api/notes",
    tags=["AI Notes"],
)


@router.post(
    "",
    response_model=LectureNoteResponse,
)
def create_note(
    note: LectureNoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher),
):
    print("POST /api/notes reached")

    created_note = add_note(
        db=db,
        data=note,
        current_user=current_user,
    )

    return created_note


@router.get(
    "",
    response_model=list[LectureNoteResponse],
)
def all_notes(
    db: Session = Depends(get_db),
):
    return list_notes(db)


@router.get(
    "/classroom/{classroom_id}",
    response_model=list[LectureNoteResponse],
)
def notes_by_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
):
    return classroom_notes(
        db,
        classroom_id,
    )