from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user

from app.models.entities.user import User
from app.schemas.notification import NotificationCreate

from app.services.notification_service import (
    add_notification,
    list_notifications,
    read_notification,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.post("")
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_notification(
        db=db,
        data=payload,
    )


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_notifications(
        db=db,
        user_id=current_user.id,
    )


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = read_notification(
        db=db,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return notification