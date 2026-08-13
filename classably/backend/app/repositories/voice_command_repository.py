from sqlalchemy.orm import Session
from app.models.models import VoiceCommandLog


def create_command(db: Session, command: VoiceCommandLog):
    db.add(command)
    db.commit()
    db.refresh(command)
    return command


def get_student_commands(db: Session, student_id: int):
    return (
        db.query(VoiceCommandLog)
        .filter(VoiceCommandLog.student_id == student_id)
        .order_by(VoiceCommandLog.created_at.desc())
        .all()
    )