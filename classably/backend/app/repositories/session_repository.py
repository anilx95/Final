from sqlalchemy.orm import Session

from app.models.entities.session import Session as SessionModel


class SessionRepository:

    def create(
        self,
        db: Session,
        session: SessionModel,
    ) -> SessionModel:

        db.add(session)

        db.commit()

        db.refresh(session)

        return session

    def get_by_uuid(
        self,
        db: Session,
        session_uuid: str,
    ) -> SessionModel | None:

        return (

            db.query(SessionModel)

            .filter(
                SessionModel.session_uuid == session_uuid
            )

            .first()

        )

    def update_status(
        self,
        db: Session,
        session: SessionModel,
        status: str,
    ) -> SessionModel:

        session.status = status

        db.commit()

        db.refresh(session)

        return session


session_repository = SessionRepository()