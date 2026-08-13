from sqlalchemy.orm import Session

from app.models.lecture_timeline import LectureTimeline


class LectureTimelineRepository:

    def create(
        self,
        db: Session,
        timeline: LectureTimeline,
    ):
        db.add(timeline)
        db.commit()
        db.refresh(timeline)
        return timeline

    def get_session_timeline(
        self,
        db: Session,
        session_id: int,
    ):
        return (
            db.query(LectureTimeline)
            .filter(
                LectureTimeline.session_id == session_id,
            )
            .order_by(
                LectureTimeline.created_at.asc()
            )
            .all()
        )


lecture_timeline_repository = LectureTimelineRepository()