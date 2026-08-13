from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_student

from app.schemas.voice_command import VoiceCommandCreate
from app.services.voice_command_service import (
    process_command,
    list_commands,
)

router = APIRouter(
    prefix="/api/voice",
    tags=["Voice Commands"],
)


@router.post("")
def create_voice_command(
    payload: VoiceCommandCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_student),
):
    return process_command(db, payload)


@router.get("/{student_id}")
def get_commands(
    student_id: int,
    db: Session = Depends(get_db),
):
    return list_commands(db, student_id)