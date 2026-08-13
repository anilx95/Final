from app.ai.orchestrator.stage import PipelineStage
from app.ai.vision.detector import detector
from app.ai.vision.postprocessor import postprocessor


class DetectionStage(PipelineStage):

    name = "DetectionStage"

    def process(self, context):

        context.detections = []
        context.detection_count = 0

        if context.frame is None:

            context.metadata["detection"] = {
                "count": 0,
                "status": "NO_FRAME",
            }

            return context

        try:

            predictions = detector.predict(
                context.frame,
            )

            detections = postprocessor.process(
                predictions,
            )

            context.detections = detections
            context.detection_count = len(detections)

            context.metadata["detection"] = {
                "count": context.detection_count,
                "status": "SUCCESS",
            }

        except Exception as exc:

            context.errors.append(
                {
                    "stage": self.name,
                    "error": str(exc),
                }
            )

            context.metadata["detection"] = {
                "count": 0,
                "status": "FAILED",
            }

        return context