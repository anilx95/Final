from app.ai.detector import detector
from app.ai.filter import filter_detections
from app.ai.accessibility import accessibility_engine
from app.ai.ocr.service import ocr_service


class PipelineOrchestrator:

    def run(
        self,
        frame,
        frame_width,
        mode,
    ):
        # Object Detection
        detections = detector.detect(frame)

        # OCR
        ocr_result = ocr_service.read(
            frame,
            detections,
        )

        # Filter detections
        detections = filter_detections(
            detections,
        )

        # Accessibility processing
        accessibility_result = (
            accessibility_engine.process(
                detections=detections,
                frame_width=frame_width,
                ocr_result=ocr_result,
                mode=mode,
            )
        )

        return (
            detections,
            ocr_result,
            accessibility_result,
        )


pipeline_orchestrator = PipelineOrchestrator()