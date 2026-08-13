from sqlalchemy.orm import Session
from app.models.models import AccessibilityProfileEvent


def create_event(db: Session, event: AccessibilityProfileEvent):
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_student_events(db: Session, student_id: int):
    return (
        db.query(AccessibilityProfileEvent)
        .filter(
            AccessibilityProfileEvent.student_id == student_id
        )
        .order_by(
            AccessibilityProfileEvent.created_at.desc()
        )
        .all()
    )