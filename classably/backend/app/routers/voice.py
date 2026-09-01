from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import VoiceCommandLog, SmartDevice, Student
from app.models.schemas import VoiceCommandIn
from app.services.voice_intent import parse_intent
from app.services.ws_manager import manager
from app.auth.dependencies import require_student

# NEW IMPORTS
from app.services.audit_service import AuditLogger
from app.core.audit_constants import AuditAction

router = APIRouter(prefix="/api/voice", tags=["Voice"])


# Maps a parsed intent to (device_type, action, value)
DEVICE_INTENT_MAP = {
    "lights_on": ("light", "set", {"on": True}),
    "lights_off": ("light", "set", {"on": False}),
    "fan_on": ("fan", "set", {"on": True}),
    "fan_off": ("fan", "set", {"on": False}),
    "curtains_open": ("curtain", "set", {"open": True}),
    "curtains_close": ("curtain", "set", {"open": False}),
    "next_slide": ("projector", "set", {"slide": "+1"}),
    "previous_slide": ("projector", "set", {"slide": "-1"}),
}


@router.post("")
async def handle_voice_command(
    payload: VoiceCommandIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_student),
):
    # Check that the student exists
    student = (
        db.query(Student)
        .filter(Student.id == payload.student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"Student with ID {payload.student_id} not found."
        )

    parsed = parse_intent(payload.text)
    intent = parsed["intent"]

    # Save voice command
    log = VoiceCommandLog(
        student_id=student.id,
        raw_text=payload.text,
        intent=intent,
        parameters=parsed["parameters"],
        success=parsed["matched"],
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    # ==========================
    # AUDIT: Voice Command
    # ==========================
    AuditLogger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.VOICE_COMMAND,
        module="voice",
        entity_id=log.id,
        details={
            "student_id": student.id,
            "classroom_id": payload.classroom_id,
            "text": payload.text,
            "intent": intent,
            "matched": parsed["matched"],
            "parameters": parsed["parameters"],
        },
    )
    db.commit()

    device_result = None

    if intent in DEVICE_INTENT_MAP:

        dtype, action, value = DEVICE_INTENT_MAP[intent]

        device = (
            db.query(SmartDevice)
            .filter(
                SmartDevice.classroom_id == payload.classroom_id,
                SmartDevice.device_type == dtype,
            )
            .first()
        )

        if device:

            state = dict(device.state or {})

            if dtype == "projector" and "slide" in value:
                current = state.get("slide", 1)
                state["slide"] = max(
                    1,
                    current + (1 if value["slide"] == "+1" else -1),
                )
            else:
                state.update(value)

            device.state = state
            db.commit()

            # ==========================
            # AUDIT: Device Control
            # ==========================
            AuditLogger.log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.DEVICE_CONTROL,
                module="voice",
                entity_id=device.id,
                details={
                    "student_id": student.id,
                    "device_name": device.name,
                    "device_type": dtype,
                    "action": action,
                    "new_state": state,
                },
            )
            db.commit()

            await manager.send_to_device(
                f"classroom-{payload.classroom_id}",
                {
                    "device_id": device.id,
                    "device_type": dtype,
                    "action": action,
                    "state": state,
                },
            )

            await manager.broadcast_to_dashboards(
                "device_state_changed",
                {
                    "device_id": device.id,
                    "device_type": dtype,
                    "name": device.name,
                    "state": state,
                },
            )

            device_result = {
                "device_id": device.id,
                "new_state": state,
            }

    if intent == "call_teacher":

        # ==========================
        # AUDIT: Teacher Assistance
        # ==========================
        AuditLogger.log(
    db=db,
    user_id=current_user.id,
    action=AuditAction.CALL_TEACHER,
    module="voice",
    entity_id=student.id,
    details={
        "student_id": student.id,
        "classroom_id": payload.classroom_id,
        "text": payload.text,
    },
)
        db.commit()

        await manager.broadcast_to_dashboards(
            "voice_assist_trigger",
            {
                "student_id": student.id,
                "classroom_id": payload.classroom_id,
                "text": payload.text,
            },
        )

    return {
        "intent": intent,
        "matched": parsed["matched"],
        "parameters": parsed["parameters"],
        "device_result": device_result,
        "log_id": log.id,
    }


@router.get("/history/{student_id}")
def voice_history(
    student_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(VoiceCommandLog)
        .filter(VoiceCommandLog.student_id == student_id)
        .order_by(VoiceCommandLog.created_at.desc())
        .limit(50)
        .all()
    )
