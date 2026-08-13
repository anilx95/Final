import logging
import time

import numpy as np
import torch
from ultralytics import YOLO

from app.ai.config import (
    MODEL_PATH,
    DEVICE,
    CONFIDENCE_THRESHOLD,
    IMAGE_SIZE,
    MAX_DETECTIONS,
)

logger = logging.getLogger(__name__)


class YOLODetector:

    def __init__(self):

        logger.info("=" * 60)
        logger.info(f"Loading YOLO model: {MODEL_PATH}")

        self.device = self._resolve_device()

        self.model = YOLO(str(MODEL_PATH))

        self.model.to(self.device)

        self.names = self.model.names

        self._warmup()

        logger.info(
            f"YOLO initialized successfully on {self.device.upper()}"
        )
        logger.info("=" * 60)

    def _resolve_device(self):

        if DEVICE.lower() == "cuda":

            if torch.cuda.is_available():
                return "cuda"

            logger.warning(
                "CUDA requested but unavailable. Falling back to CPU."
            )

        return "cpu"

    def _warmup(self):

        logger.info("Running YOLO warm-up...")

        dummy = np.zeros(
            (
                IMAGE_SIZE,
                IMAGE_SIZE,
                3,
            ),
            dtype=np.uint8,
        )

        with torch.inference_mode():

            self.model.predict(
                source=dummy,
                conf=CONFIDENCE_THRESHOLD,
                imgsz=IMAGE_SIZE,
                max_det=MAX_DETECTIONS,
                device=self.device,
                verbose=False,
            )

        logger.info("Warm-up completed.")

    def detect(self, frame):

        if frame is None:
            raise ValueError("Detector received an empty frame.")

        start = time.perf_counter()

        try:

            with torch.inference_mode():

                results = self.model.predict(
                    source=frame,
                    conf=CONFIDENCE_THRESHOLD,
                    imgsz=IMAGE_SIZE,
                    max_det=MAX_DETECTIONS,
                    device=self.device,
                    verbose=False,
                )

            detections = []

            for result in results:

                if result.boxes is None:
                    continue

                for box in result.boxes:

                    cls = int(box.cls.item())

                    confidence = float(box.conf.item())

                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0].tolist(),
                    )

                    detections.append(
                        {
                            "track_id": None,
                            "class_id": cls,
                            "class_name": self.names.get(
                                cls,
                                str(cls),
                            ),
                            "confidence": round(
                                confidence,
                                4,
                            ),
                            "bbox": [
                                x1,
                                y1,
                                x2,
                                y2,
                            ],
                        }
                    )

            elapsed = (
                time.perf_counter()
                - start
            ) * 1000

            logger.debug(
                "YOLO detected %d objects in %.2f ms",
                len(detections),
                elapsed,
            )

            return detections

        except Exception:

            logger.exception(
                "YOLO detection failed."
            )

            raise


detector = YOLODetector()

logger.info(
    "Detector running on %s",
    detector.device.upper(),
)