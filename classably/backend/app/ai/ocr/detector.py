import logging

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

from .config import (
    LANGUAGE,
    USE_GPU,
    USE_ANGLE_CLASSIFIER,
    SHOW_LOG,
)

logger = logging.getLogger(__name__)


class OCRDetector:

    def __init__(self):
        self._ocr = None

    @property
    def ocr(self):
        if self._ocr is None:
            if PaddleOCR is None:
                raise RuntimeError("PaddleOCR is not installed. Please install paddlepaddle and paddleocr.")
            logger.info("Initializing PaddleOCR...")
            self._ocr = PaddleOCR(
                lang=LANGUAGE,
                use_gpu=USE_GPU,
                use_angle_cls=USE_ANGLE_CLASSIFIER,
                show_log=SHOW_LOG,
            )
            logger.info("PaddleOCR initialized successfully.")
        return self._ocr

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