from app.ai.orchestrator.stage import PipelineStage
from app.ai.tracking.trajectory_predictor import (
    trajectory_predictor,
)


class TrajectoryStage(PipelineStage):

    name = "TrajectoryStage"

    def process(self, context):

        try:

            context.detections = (
                trajectory_predictor.predict(
                    context.detections
                )
            )

            context.metadata["trajectory"] = {
                "object_count": len(context.detections),
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["trajectory"] = {
                "object_count": 0,
                "status": "FAILED",
            }

        return context