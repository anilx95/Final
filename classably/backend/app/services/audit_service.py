from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models.models import AuditLog
from app.core.audit_constants import AuditAction


class AuditLogger:
    """
    Centralized Audit Logger.

    Every module should use this service instead of directly
    inserting into the audit_logs table.

    NOTE:
    This service DOES NOT call db.commit().
    The calling service/router should commit the transaction.
    """

    @staticmethod
    def log(
        db: Session,
        *,
        user_id: Optional[int],
        action: str,
        module: str,
        entity_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:

        log = AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(log)

        # Do NOT commit here.
        # Let the caller commit both business data and audit log together.

        return log

    @staticmethod
    def log_login(
        db: Session,
        *,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.LOGIN,
            module="auth",
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @staticmethod
    def log_logout(
        db: Session,
        *,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.LOGOUT,
            module="auth",
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @staticmethod
    def log_error(
        db: Session,
        *,
        user_id: Optional[int],
        module: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action="ERROR",
            module=module,
            details={
                "message": message,
                **(details or {}),
            },
        )

    @staticmethod
    def log_voice_command(
        db: Session,
        *,
        user_id: Optional[int],
        entity_id: Optional[int],
        intent: str,
        success: bool,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.VOICE_COMMAND,
            module="voice",
            entity_id=entity_id,
            details={
                "intent": intent,
                "success": success,
            },
        )

    @staticmethod
    def log_attendance(
        db: Session,
        *,
        user_id: Optional[int],
        entity_id: Optional[int],
        student_id: int,
        classroom_id: int,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.ATTENDANCE_MARKED,
            module="attendance",
            entity_id=entity_id,
            details={
                "student_id": student_id,
                "classroom_id": classroom_id,
            },
        )

    @staticmethod
    def log_device_control(
        db: Session,
        *,
        user_id: Optional[int],
        entity_id: Optional[int],
        device_type: str,
        state: Dict[str, Any],
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.DEVICE_CONTROL,
            module="devices",
            entity_id=entity_id,
            details={
                "device_type": device_type,
                "state": state,
            },
        )

    @staticmethod
    def log_lecture_created(
        db: Session,
        *,
        user_id: Optional[int],
        entity_id: Optional[int],
        title: str,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.LECTURE_CREATED,
            module="lecture_notes",
            entity_id=entity_id,
            details={
                "title": title,
            },
        )

    @staticmethod
    def log_accessibility_update(
        db: Session,
        *,
        user_id: Optional[int],
        entity_id: Optional[int],
        event_type: str,
    ) -> AuditLog:

        return AuditLogger.log(
            db=db,
            user_id=user_id,
            action=AuditAction.ACCESSIBILITY_UPDATED,
            module="accessibility",
            entity_id=entity_id,
            details={
                "event_type": event_type,
            },
        )