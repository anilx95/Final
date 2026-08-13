from app.ai.orchestrator.stage import PipelineStage
from app.ai.tracking.tracker import tracker


class TrackingStage(PipelineStage):

    name = "TrackingStage"

    def process(self, context):

        try:

            context.tracks = tracker.update(
                context.filtered_detections
            )

            context.metadata["tracking"] = {
                "track_count": len(context.tracks),
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.tracks = []

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["tracking"] = {
                "track_count": 0,
                "status": "FAILED",
            }

        return context