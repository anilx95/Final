from app.ai.orchestrator.stage import PipelineStage
from app.ai.activity.recognizer import recognizer

# Can be moved to config.py later
ACTIVE_ACTIVITIES = {
    "walking",
    "writing_board",
    "raising_hand",
}


class ActivityStage(PipelineStage):

    name = "ActivityStage"

    def process(self, context):

        try:

            # --------------------------------------------------
            # Activity Recognition
            # --------------------------------------------------

            context.activities = recognizer.recognize(
                context.tracks
            )

            # --------------------------------------------------
            # Classroom State
            # --------------------------------------------------

            context.classroom_state = {
                "total_people": len(context.tracks),
                "total_activities": len(
                    context.activities
                ),
            }

            # --------------------------------------------------
            # Participation
            # --------------------------------------------------

            active_students = sum(
                1
                for activity in context.activities
                if activity.get("activity")
                in ACTIVE_ACTIVITIES
            )

            context.participation = {
                "active_students": active_students,
            }

            # --------------------------------------------------
            # Engagement Score
            # --------------------------------------------------

            if context.tracks:

                context.engagement_score = round(
                    (
                        active_students
                        / len(context.tracks)
                    )
                    * 100,
                    2,
                )

            else:

                context.engagement_score = 0.0

            # --------------------------------------------------
            # Metadata
            # --------------------------------------------------

            context.metadata["activity"] = {
                "people_count": len(
                    context.tracks
                ),
                "activity_count": len(
                    context.activities
                ),
                "active_students": active_students,
                "engagement_score": context.engagement_score,
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.activities = []

            context.classroom_state = {
                "total_people": 0,
                "total_activities": 0,
            }

            context.participation = {
                "active_students": 0,
            }

            context.engagement_score = 0.0

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["activity"] = {
                "people_count": 0,
                "activity_count": 0,
                "active_students": 0,
                "engagement_score": 0.0,
                "status": "FAILED",
            }

        return context