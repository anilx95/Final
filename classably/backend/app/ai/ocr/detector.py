import logging

from paddleocr import PaddleOCR

from .config import (
    LANGUAGE,
    USE_GPU,
    USE_ANGLE_CLASSIFIER,
    SHOW_LOG,
)

logger = logging.getLogger(__name__)


class OCRDetector:

    def __init__(self):

        logger.info("Initializing PaddleOCR...")

        self.ocr = PaddleOCR(
            lang=LANGUAGE,
            use_gpu=USE_GPU,
            use_angle_cls=USE_ANGLE_CLASSIFIER,
            show_log=SHOW_LOG,
        )

        logger.info("PaddleOCR initialized successfully.")

    def detect(self, image):

        if image is None:
            raise ValueError("OCR received an empty image.")

        try:
            result = self.ocr.ocr(
                image,
                cls=USE_ANGLE_CLASSIFIER,
            )

            return result

        except Exception:
            logger.exception("OCR detection failed.")
            raise


ocr_detector = OCRDetector()