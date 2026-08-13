from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import LectureSession
from app.repositories.lecture_session_repository import (
    lecture_session_repository,
)


class LectureSessionService:

    def start_session(
        self,
        db: Session,
        classroom_id: int,
        teacher_id: int,
        subject: str,
    ):
        """
        Starts a new lecture session.
        If an active session already exists for the classroom,
        return it instead of creating another.
        """

        active = lecture_session_repository.get_active_session(
            db=db,
            classroom_id=classroom_id,
        )

        if active:
            return active

        session = LectureSession(
            classroom_id=classroom_id,
            teacher_id=teacher_id,
            subject=subject,
            status="ACTIVE",
            started_at=datetime.utcnow(),
        )

        return lecture_session_repository.create(
            db=db,
            session=session,
        )

    def get_active_session(
        self,
        db: Session,
        classroom_id: int,
    ):
        return lecture_session_repository.get_active_session(
            db=db,
            classroom_id=classroom_id,
        )

    def get_classroom_sessions(
        self,
        db: Session,
        classroom_id: int,
    ):
        return lecture_session_repository.get_by_classroom(
            db=db,
            classroom_id=classroom_id,
        )

    def end_session(
        self,
        db: Session,
        session_id: int,
    ):
        session = lecture_session_repository.get_by_id(
            db=db,
            session_id=session_id,
        )

        if session is None:
            return None

        session.status = "ENDED"
        session.ended_at = datetime.utcnow()

        return lecture_session_repository.update(
            db=db,
            session=session,
        )

    def end_active_session(
        self,
        db: Session,
        classroom_id: int,
    ):
        session = lecture_session_repository.get_active_session(
            db=db,
            classroom_id=classroom_id,
        )

        if session is None:
            return None

        session.status = "ENDED"
        session.ended_at = datetime.utcnow()

        return lecture_session_repository.update(
            db=db,
            session=session,
        )


lecture_session_service = LectureSessionService()