import asyncio
import logging
import time
import uuid
from queue import Full

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.ai.async_pipeline.frame_queue import (
    FRAME_QUEUE,
    REQUEST_LOCK,
    REQUEST_RESULTS,
)
from app.ai.modes import AIMode

logger = logging.getLogger(__name__)


class CameraService:

    async def process_frame(
        self,
        image: UploadFile,
        classroom_id: int,
        db: Session,  # Kept for compatibility (currently unused)
    ):
        start_time = time.perf_counter()

        try:

            image_bytes = await image.read()

            if not image_bytes:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded image is empty.",
                )

            request_id = str(uuid.uuid4())

            # Worker creates its own DB session.
            job = {
                "request_id": request_id,
                "image_bytes": image_bytes,
                "classroom_id": classroom_id,
                "mode": AIMode.CLASSROOM,
            }

            try:

                FRAME_QUEUE.put(
                    job,
                    timeout=2,
                )

            except Full:

                raise HTTPException(
                    status_code=503,
                    detail="AI pipeline is busy. Please try again.",
                )

            timeout = 30
            wait_start = time.monotonic()

            result = None

            while True:

                with REQUEST_LOCK:

                    if request_id in REQUEST_RESULTS:

                        result = REQUEST_RESULTS.pop(
                            request_id
                        )

                        break

                if (
                    time.monotonic() - wait_start
                    > timeout
                ):

                    raise HTTPException(
                        status_code=504,
                        detail="AI pipeline timed out.",
                    )

                await asyncio.sleep(0.01)

            processing_time = round(
                (time.perf_counter() - start_time) * 1000,
                2,
            )

            if isinstance(result, dict):

                result["request_id"] = request_id
                result["processing_time_ms"] = processing_time

            logger.info(
                "Camera frame processed successfully in %.2f ms.",
                processing_time,
            )

            return result

        except HTTPException:
            raise

        except Exception:

            logger.exception(
                "Camera processing failed."
            )

            raise HTTPException(
                status_code=500,
                detail="Failed to process camera frame.",
            )


camera_service = CameraService()