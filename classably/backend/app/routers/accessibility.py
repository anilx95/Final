from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_student

from app.schemas.accessibility import (
    AccessibilityEventCreate,
    AccessibilityEventResponse,
)

from app.services.accessibility_service import (
    add_event,
    list_events,
)

router = APIRouter(
    prefix="/api/accessibility",
    tags=["Accessibility"],
)


@router.post(
    "",
    response_model=AccessibilityEventResponse,
)
def create_accessibility_event(
    payload: AccessibilityEventCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_student),
):
    return add_event(
        db=db,
        data=payload,
        current_user=current_user,
    )


@router.get(
    "/{student_id}",
    response_model=List[AccessibilityEventResponse],
)
def get_accessibility_events(
    student_id: int,
    db: Session = Depends(get_db),
):
    return list_events(
        db=db,
        student_id=student_id,
    )