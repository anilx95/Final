from app.ai.orchestrator.stage import PipelineStage
from app.ai.navigation.collision_predictor import (
    collision_predictor,
)


class CollisionStage(PipelineStage):

    name = "CollisionStage"

    def process(self, context):

        try:

            context.detections = (
                collision_predictor.predict(
                    context.detections
                )
            )

            context.metadata["collision"] = {
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

            context.metadata["collision"] = {
                "object_count": 0,
                "status": "FAILED",
            }

        return context