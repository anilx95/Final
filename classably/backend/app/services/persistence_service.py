from sqlalchemy.orm import Session

from app.models.entities.ai_result import AIResult
from app.models.entities.analytics import Analytics
from app.models.entities.session import Session as SessionModel
from app.models.entities.timeline import TimelineEvent

from app.repositories.ai_result_repository import ai_result_repository
from app.repositories.analytics_repository import analytics_repository
from app.repositories.session_repository import session_repository
from app.repositories.timeline_repository import timeline_repository


class PersistenceService:

    def save_pipeline_result(
        self,
        db: Session,
        context,
    ):

        # ----------------------------
        # Session
        # ----------------------------

        session = session_repository.get_by_uuid(
            db,
            context.session_id,
        )

        if session is None:

            session = SessionModel(

                session_uuid=context.session_id,

                camera_name=getattr(
                    context,
                    "camera_name",
                    None,
                ),

            )

            session = session_repository.create(
                db,
                session,
            )

        # ----------------------------
        # Analytics
        # ----------------------------

        analytics = Analytics(

            session_id=session.id,

            engagement_score=getattr(
                context,
                "engagement_score",
                0.0,
            ),

            attention_score=getattr(
                context,
                "attention_score",
                0.0,
            ),

            participation_score=getattr(
                context,
                "participation_score",
                0.0,
            ),

        )

        analytics_repository.create(
            db,
            analytics,
        )

        # ----------------------------
        # Timeline
        # ----------------------------

        for event in getattr(
            context,
            "timeline",
            [],
        ):

            timeline_event = TimelineEvent(

                session_id=session.id,

                event_type=event.get(
                    "event",
                    "unknown",
                ),

                priority=event.get(
                    "priority",
                    "normal",
                ),

                confidence=event.get(
                    "confidence",
                    1.0,
                ),

                payload=event,

            )

            timeline_repository.create(
                db,
                timeline_event,
            )

        # ----------------------------
        # AI Result
        # ----------------------------

        result = AIResult(

            session_id=session.id,

            processing_time=context.processing_time,

            detections=getattr(
                context,
                "detections",
                [],
            ),

            analytics=getattr(
                context,
                "analytics",
                {},
            ),

            navigation=(
                context.navigation.__dict__
                if getattr(
                    context,
                    "navigation",
                    None,
                )
                else None
            ),

            voice_messages=[
                message.message
                for message in getattr(
                    context,
                    "voice_messages",
                    [],
                )
            ],

        )

        ai_result_repository.create(
            db,
            result,
        )

        return session


persistence_service = PersistenceService()