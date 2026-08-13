from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Text
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from sqlalchemy.orm import relationship

from app.db.base import Base


class LectureTimeline(Base):

    __tablename__ = "lecture_timelines"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    session_id = Column(
        Integer,
        ForeignKey("lecture_sessions.id"),
        nullable=False,
    )

    transcript = Column(
        Text,
        nullable=False,
    )

    summary = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    session = relationship(
        "LectureSession",
        back_populates="timeline",
    )