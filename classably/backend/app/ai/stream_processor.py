import logging
import time

from sqlalchemy.orm import Session

from app.ai.modes import AIMode
from app.ai.processor import processor

logger = logging.getLogger(__name__)


class StreamProcessor:
    """
    Handles live camera frames from the WebSocket.

    Keeps WebSocket logic separate from AI inference by
    delegating all processing to the shared processor.
    """

    def process(
        self,
        frame,
        classroom_id: int,
        db: Session,
        mode: AIMode = AIMode.CLASSROOM,
    ) -> dict:

        if frame is None:

            return {
                "success": False,
                "error": "Empty frame received.",
            }

        start = time.perf_counter()

        try:

            result = processor.process(
                image_bytes=frame,
                classroom_id=classroom_id,
                db=db,
                mode=mode,
            )

            if result is None:

                result = {
                    "success": False,
                    "error": "Processor returned no result.",
                }

            elapsed = round(
                (time.perf_counter() - start) * 1000,
                2,
            )

            result.setdefault(
                "metadata",
                {},
            )

            result["metadata"]["stream_processing_time_ms"] = elapsed

            return result

        except Exception:

            logger.exception(
                "Stream processing failed."
            )

            return {
                "success": False,
                "error": "AI stream processing failed.",
                "metadata": {
                    "stream_processing_time_ms": round(
                        (time.perf_counter() - start) * 1000,
                        2,
                    ),
                },
            }


stream_processor = StreamProcessor()