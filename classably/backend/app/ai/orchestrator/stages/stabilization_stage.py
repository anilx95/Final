from app.ai.orchestrator.stage import PipelineStage
from app.ai.tracking.class_stabilizer import class_stabilizer
from app.ai.config import ENABLE_CLASS_STABILIZATION


class StabilizationStage(PipelineStage):

    name = "StabilizationStage"

    def process(self, context):

        try:

            if not ENABLE_CLASS_STABILIZATION:

                context.stabilized_tracks = context.tracks

                context.metadata["stabilization"] = {
                    "enabled": False,
                    "track_count": len(context.tracks),
                    "status": "SKIPPED",
                }

                return context

            context.stabilized_tracks = (
                class_stabilizer.stabilize(
                    context.tracks
                )
            )

            context.metadata["stabilization"] = {
                "enabled": True,
                "track_count": len(context.stabilized_tracks),
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.stabilized_tracks = context.tracks

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["stabilization"] = {
                "enabled": ENABLE_CLASS_STABILIZATION,
                "track_count": len(context.tracks),
                "status": "FAILED",
            }

        return context