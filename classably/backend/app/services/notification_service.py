from app.models.notification import Notification

from app.repositories.notification_repository import (
    create_notification,
    get_notifications,
    mark_read,
)


def add_notification(
    db,
    data,
):
    notification = Notification(
        user_id=data.user_id,
        title=data.title,
        message=data.message,
        type=data.type,
    )

    return create_notification(
        db,
        notification,
    )


def list_notifications(
    db,
    user_id,
):
    return get_notifications(
        db,
        user_id,
    )


def read_notification(
    db,
    notification_id,
):
    return mark_read(
        db,
        notification_id,
    )


def create_system_notification(
    db,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
    )

    return create_notification(
        db,
        notification,
    )