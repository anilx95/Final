from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AccessibilityProfileEvent, Student
from app.models.schemas import ProfileEventIn
from app.services.adaptive_profile import recommend_profile
from app.services.ws_manager import manager

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.post("/event")
async def log_event(payload: ProfileEventIn, db: Session = Depends(get_db)):
    event = AccessibilityProfileEvent(
        student_id=payload.student_id,
        event_type=payload.event_type,
        value=payload.value,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Recompute recommendation immediately after each new signal.
    events = db.query(AccessibilityProfileEvent).filter(
        AccessibilityProfileEvent.student_id == payload.student_id
    ).all()
    events_dicts = [
        {"event_type": e.event_type, "value": e.value, "created_at": e.created_at}
        for e in events
    ]
    recommendation = recommend_profile(events_dicts)

    if recommendation["recommended_mode"]:
        student = db.get(Student, payload.student_id)
        await manager.broadcast_to_dashboards("adaptive_profile_suggestion", {
            "student_id": payload.student_id,
            "student_name": student.name if student else "Unknown",
            "recommendation": recommendation,
        })

    return {"event_id": event.id, "recommendation": recommendation}


@router.get("/recommendation/{student_id}")
def get_recommendation(student_id: int, db: Session = Depends(get_db)):
    events = db.query(AccessibilityProfileEvent).filter(
        AccessibilityProfileEvent.student_id == student_id
    ).all()
    events_dicts = [
        {"event_type": e.event_type, "value": e.value, "created_at": e.created_at}
        for e in events
    ]
    return recommend_profile(events_dicts)
