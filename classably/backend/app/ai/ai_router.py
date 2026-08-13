import logging

from app.ai.classroom_mode import classroom_mode
from app.ai.modes import AIMode
from app.ai.navigation_mode import navigation_mode
from app.ai.reading_mode import reading_mode

logger = logging.getLogger(__name__)


class AIRouter:

    def process(
        self,
        mode,
        detections,
        ocr_result=None,
    ):

        if detections is None:
            detections = []

        if ocr_result is None:
            ocr_result = {
                "text": "",
                "changed": False,
            }

        try:

            if mode == AIMode.CLASSROOM:

                logger.debug("AI Mode: CLASSROOM")

                return classroom_mode.process(
                    detections=detections,
                    ocr_result=ocr_result,
                )

            elif mode == AIMode.READING:

                logger.debug("AI Mode: READING")

                return reading_mode.process(
                    detections=detections,
                    ocr_result=ocr_result,
                )

            elif mode == AIMode.NAVIGATION:

                logger.debug("AI Mode: NAVIGATION")

                return navigation_mode.process(
                    detections=detections,
                )

            logger.warning(
                "Unknown AI mode '%s'. Falling back to NAVIGATION.",
                mode,
            )

            return navigation_mode.process(
                detections=detections,
            )

        except Exception:

            logger.exception(
                "AI Router processing failed."
            )

            return [
                "AI assistant is temporarily unavailable."
            ]


ai_router = AIRouter()