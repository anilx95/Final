from sqlalchemy.orm import Session

from app.repositories.event_repository import (
    event_repository,
)


class EventService:

    def save(
        self,
        db: Session,
        event,
    ):

        return event_repository.create(

            db,

            event.to_dict(),

        )

    def latest(
        self,
        db: Session,
        limit=100,
    ):

        return event_repository.latest(

            db,

            limit,

        )


event_service = EventService()