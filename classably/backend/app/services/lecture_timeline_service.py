from app.models.lecture_timeline import LectureTimeline

from app.repositories.lecture_timeline_repository import (
    lecture_timeline_repository,
)


class LectureTimelineService:

    def add_entry(
        self,
        db,
        session_id,
        transcript,
        summary,
    ):

        timeline = LectureTimeline(
            session_id=session_id,
            transcript=transcript,
            summary=summary,
        )

        return lecture_timeline_repository.create(
            db,
            timeline,
        )

    def get_timeline(
        self,
        db,
        session_id,
    ):
        return lecture_timeline_repository.get_session_timeline(
            db,
            session_id,
        )


lecture_timeline_service = LectureTimelineService()