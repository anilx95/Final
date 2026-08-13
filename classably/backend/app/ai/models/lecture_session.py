from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base


class LectureSession(Base):

    __tablename__ = "lecture_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    classroom_id = Column(
        Integer,
        nullable=False,
    )

    teacher_id = Column(
        Integer,
        nullable=False,
    )

    subject = Column(
        String(200),
        nullable=False,
    )

    status = Column(
        String(20),
        default="ACTIVE",
    )

    started_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    ended_at = Column(
        DateTime,
        nullable=True,
    )

    notes = relationship(
        "LectureNote",
        back_populates="session",
    )