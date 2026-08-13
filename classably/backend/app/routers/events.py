from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.services.event_service import (
    event_service,
)

router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


@router.get("/latest")

def latest_events(

    limit: int = 100,

    db: Session = Depends(get_db),

):

    return event_service.latest(

        db,

        limit,

    )