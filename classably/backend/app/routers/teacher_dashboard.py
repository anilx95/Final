from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_admin

from app.services.teacher_dashboard_service import (
    dashboard_summary,
)

router = APIRouter(
    prefix="/api/teacher-dashboard",
    tags=["Teacher Dashboard"],
)


@router.get("/{teacher_id}")
def get_dashboard(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    dashboard = dashboard_summary(
        db,
        teacher_id,
    )

    if dashboard is None:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found",
        )

    return dashboard