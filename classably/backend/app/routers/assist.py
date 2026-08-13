from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AccessibilityRequest, Student
from app.models.schemas import AssistRequestCreate, AssistRequestUpdate
from app.services.ws_manager import manager

router = APIRouter(prefix="/api/assist", tags=["assist"])


@router.post("")
async def create_request(payload: AssistRequestCreate, db: Session = Depends(get_db)):
    req = AccessibilityRequest(**payload.dict())
    db.add(req)
    db.commit()
    db.refresh(req)

    student = db.get(Student, payload.student_id)
    await manager.broadcast_to_dashboards("assist_request", {
        "id": req.id,
        "student_id": payload.student_id,
        "student_name": student.name if student else "Unknown",
        "classroom_id": payload.classroom_id,
        "request_type": payload.request_type,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
    })
    return req


@router.get("")
def list_requests(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(AccessibilityRequest)
    if status:
        q = q.filter(AccessibilityRequest.status == status)
    return q.order_by(AccessibilityRequest.created_at.desc()).all()


@router.patch("/{request_id}")
async def update_request(request_id: int, payload: AssistRequestUpdate, db: Session = Depends(get_db)):
    req = db.get(AccessibilityRequest, request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    req.status = payload.status
    if payload.status == "resolved":
        req.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    await manager.broadcast_to_dashboards("assist_request_updated", {
        "id": req.id, "status": req.status,
    })
    return req
