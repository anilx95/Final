import logging
import time

from app.ai.orchestrator.context import PipelineContext
from app.ai.orchestrator.pipeline import pipeline

logger = logging.getLogger(__name__)


class AIProcessor:

    def __init__(self):
        logger.info("AI Processor initialized.")

    def process(
        self,
        image_bytes: bytes,
        classroom_id: int,
        db,
        mode,
    ):

        start = time.perf_counter()

        try:

            # Create pipeline context
            context = PipelineContext(
                image=image_bytes,
                classroom_id=classroom_id,
                db=db,
                mode=mode,
            )

            # Execute AI pipeline
            context = pipeline.execute(context)

            processing_time = round(
                (time.perf_counter() - start) * 1000,
                2,
            )

            raw_detections = getattr(context, "detections", [])
            ocr_res = getattr(context, "ocr_result", {})
            if isinstance(ocr_res, dict):
                ocr_text = ocr_res.get("full_text") or ocr_res.get("text") or ""
            else:
                ocr_text = str(ocr_res or "")

            return {
                "success": True,
                "processing_time_ms": processing_time,
                "session_id": getattr(context, "session_id", None),
                "objects": raw_detections,
                "detections": raw_detections,
                "ocr": ocr_text,
                "ocr_result": ocr_res,
                "riskLevel": getattr(context, "risk_level", "LOW"),
                "activity": getattr(context, "activity", {}),
                "navigation": getattr(context, "navigation", {}),
                "announcements": getattr(context, "announcements", []),
                "analytics": getattr(context, "analytics", {}),
                "metadata": getattr(context, "metadata", {}),
                "timings": getattr(context, "timings", {}),
                "errors": getattr(context, "errors", []),
            }

        except Exception as exc:

            logger.exception("Pipeline failed")

            return {

                "success": False,

                "processing_time_ms": 0,

                "session_id": None,

                "detections": [],

                "ocr": {},

                "activity": {},

                "navigation": {},

                "announcements": [],

                "analytics": {},

                "metadata": {},

                "timings": {},

                "errors": [str(exc)],

            }


processor = AIProcessor()