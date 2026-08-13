from app.models.models import AccessibilityProfileEvent

from app.repositories.accessibility_repository import (
    create_event,
    get_student_events,
)

from app.services.audit_service import AuditLogger
from app.services.notification_service import (
    create_system_notification,
)


def add_event(
    db,
    data,
    current_user,
):
    event = AccessibilityProfileEvent(
        student_id=data.student_id,
        event_type=data.event_type,
        value=data.value,
    )

    # ==================================
    # Save Accessibility Event
    # ==================================
    event = create_event(
        db,
        event,
    )

    # ==================================
    # Audit Log
    # ==================================
    AuditLogger.log_accessibility_update(
        db=db,
        user_id=current_user.id,
        entity_id=event.id,
        event_type=event.event_type,
    )

    # ==================================
    # Notification
    # ==================================
    create_system_notification(
        db=db,
        user_id=current_user.id,
        title="Accessibility Updated",
        message="Your accessibility settings have been updated successfully.",
        notification_type="accessibility",
    )

    return event


def list_events(
    db,
    student_id,
):
    return get_student_events(
        db,
        student_id,
    )