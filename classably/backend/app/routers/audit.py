from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import AuditLog
from app.auth.dependencies import require_admin

router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"],
)


@router.get("")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    if module:
        query = query.filter(AuditLog.module == module)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()

    logs = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": logs,
    }


@router.get("/{log_id}")
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return db.query(AuditLog).filter(AuditLog.id == log_id).first()