"""
NEW FEATURE (differentiator #3): Offline-first resilience.

Real Indian classrooms often have patchy wifi. The mobile/web client is
expected to queue attendance marks, assist requests, and notes locally
(synced=False) whenever a write fails, then call this endpoint in one batch
the moment connectivity returns. This keeps the core UX (mark attendance,
raise an assist request) working even mid-outage, rather than silently
failing.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Attendance, AccessibilityRequest, LectureNote
from app.models.schemas import SyncBatch

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/batch")
def sync_batch(payload: SyncBatch, db: Session = Depends(get_db)):
    synced = {"attendance": 0, "requests": 0, "notes": 0}

    if payload.attendance_ids:
        db.query(Attendance).filter(Attendance.id.in_(payload.attendance_ids)).update(
            {"synced": True}, synchronize_session=False
        )
        synced["attendance"] = len(payload.attendance_ids)

    if payload.request_ids:
        db.query(AccessibilityRequest).filter(AccessibilityRequest.id.in_(payload.request_ids)).update(
            {"synced": True}, synchronize_session=False
        )
        synced["requests"] = len(payload.request_ids)

    if payload.note_ids:
        db.query(LectureNote).filter(LectureNote.id.in_(payload.note_ids)).update(
            {"synced": True}, synchronize_session=False
        )
        synced["notes"] = len(payload.note_ids)

    db.commit()
    return {"synced": synced}


@router.get("/pending")
def pending(db: Session = Depends(get_db)):
    return {
        "attendance": db.query(Attendance).filter(Attendance.synced == False).count(),  # noqa: E712
        "requests": db.query(AccessibilityRequest).filter(AccessibilityRequest.synced == False).count(),  # noqa: E712
        "notes": db.query(LectureNote).filter(LectureNote.synced == False).count(),  # noqa: E712
    }
