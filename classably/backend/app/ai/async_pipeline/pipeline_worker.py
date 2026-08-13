import logging
import queue
import threading

from app.ai.async_pipeline.frame_queue import (
    FRAME_QUEUE,
    VOICE_QUEUE,
    REQUEST_LOCK,
    REQUEST_RESULTS,
)
from app.ai.processor import processor
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


class PipelineWorker(threading.Thread):

    def __init__(self):
        super().__init__(daemon=True)
        self.stop_event = threading.Event()

    def stop(self):
        self.stop_event.set()

    def run(self):

        logger.info("Pipeline worker started.")

        while not self.stop_event.is_set():

            try:
                job = FRAME_QUEUE.get(timeout=1)

            except queue.Empty:
                continue

            request_id = job["request_id"]

            db = SessionLocal()

            try:

                result = processor.process(
                    image_bytes=job["image_bytes"],
                    classroom_id=job["classroom_id"],
                    db=db,
                    mode=job["mode"],
                )

                if isinstance(result, dict):

                    announcements = result.get(
                        "announcements",
                        [],
                    )

                    for message in announcements:

                        try:
                            VOICE_QUEUE.put_nowait(message)

                        except queue.Full:
                            logger.warning(
                                "Voice queue full. Dropping announcement."
                            )

                with REQUEST_LOCK:

                    REQUEST_RESULTS[request_id] = result

            except Exception:

                logger.exception("Pipeline worker failed.")

                with REQUEST_LOCK:

                    REQUEST_RESULTS[request_id] = {
                        "success": False,
                        "error": "Pipeline failed.",
                    }

            finally:

                db.close()

                FRAME_QUEUE.task_done()

        logger.info("Pipeline worker stopped.")