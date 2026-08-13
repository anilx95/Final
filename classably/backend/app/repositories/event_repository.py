from sqlalchemy.orm import Session

from app.models.event import Event


class EventRepository:

    def create(
        self,
        db: Session,
        data: dict,
    ):

        event = Event(**data)

        db.add(event)

        db.commit()

        db.refresh(event)

        return event

    def latest(
        self,
        db: Session,
        limit: int = 100,
    ):

        return (
            db.query(Event)
            .order_by(Event.created_at.desc())
            .limit(limit)
            .all()
        )


event_repository = EventRepository()