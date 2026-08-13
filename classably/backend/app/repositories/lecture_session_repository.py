from sqlalchemy.orm import Session

from app.models.models import LectureSession


class LectureSessionRepository:

    def create(
        self,
        db: Session,
        session: LectureSession,
    ):
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_active_session(
        self,
        db: Session,
        classroom_id: int,
    ):
        return (
            db.query(LectureSession)
            .filter(
                LectureSession.classroom_id == classroom_id,
                LectureSession.status == "ACTIVE",
            )
            .first()
        )

    def get_all_active_sessions(
        self,
        db: Session,
    ):
        return (
            db.query(LectureSession)
            .filter(LectureSession.status == "ACTIVE")
            .order_by(LectureSession.started_at.desc())
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        session_id: int,
    ):
        return (
            db.query(LectureSession)
            .filter(
                LectureSession.id == session_id,
            )
            .first()
        )

    def get_by_classroom(
        self,
        db: Session,
        classroom_id: int,
    ):
        return (
            db.query(LectureSession)
            .filter(
                LectureSession.classroom_id == classroom_id,
            )
            .order_by(
                LectureSession.started_at.desc()
            )
            .all()
        )

    def end_active_session(
        self,
        db: Session,
        classroom_id: int,
    ):
        session = self.get_active_session(
            db=db,
            classroom_id=classroom_id,
        )

        if not session:
            return None

        session.status = "ENDED"

        self.update(
            db=db,
            session=session,
        )

        return session

    def update(
        self,
        db: Session,
        session: LectureSession,
    ):
        db.commit()
        db.refresh(session)
        return session


lecture_session_repository = LectureSessionRepository()