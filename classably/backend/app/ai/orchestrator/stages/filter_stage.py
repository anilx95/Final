from app.ai.orchestrator.stage import PipelineStage
from app.ai.filter import filter_detections


class FilterStage(PipelineStage):

    name = "FilterStage"

    def process(self, context):

        try:

            context.filtered_detections = filter_detections(
                context.detections
            )

            context.metadata["filter"] = {
                "input_count": len(context.detections),
                "output_count": len(context.filtered_detections),
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.filtered_detections = []

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["filter"] = {
                "input_count": len(context.detections),
                "output_count": 0,
                "status": "FAILED",
            }

        return context