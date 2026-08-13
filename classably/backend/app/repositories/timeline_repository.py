from sqlalchemy.orm import Session

from app.models.entities.timeline import TimelineEvent


class TimelineRepository:

    def create(
        self,
        db: Session,
        event: TimelineEvent,
    ) -> TimelineEvent:

        db.add(event)

        db.commit()

        db.refresh(event)

        return event

    def get_by_session(
        self,
        db: Session,
        session_id: int,
    ) -> list[TimelineEvent]:

        return (

            db.query(TimelineEvent)

            .filter(
                TimelineEvent.session_id == session_id
            )

            .order_by(
                TimelineEvent.created_at
            )

            .all()

        )


timeline_repository = TimelineRepository()