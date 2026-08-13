from app.models.models import VoiceCommandLog
from app.repositories.voice_command_repository import (
    create_command,
    get_student_commands,
)


def detect_intent(text: str):
    t = text.lower()

    if "font" in t:
        return "change_font", {}

    elif "read" in t:
        return "read_notes", {}

    elif "navigate" in t:
        return "navigation", {}

    elif "attendance" in t:
        return "attendance", {}

    return "unknown", {}


def process_command(db, data):
    intent, params = detect_intent(data.raw_text)

    command = VoiceCommandLog(
        student_id=data.student_id,
        raw_text=data.raw_text,
        intent=intent,
        parameters=params,
        success=True,
    )

    return create_command(db, command)


def list_commands(db, student_id):
    return get_student_commands(db, student_id)