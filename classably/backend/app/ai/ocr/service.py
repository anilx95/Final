import logging

from .board_detector import board_detector
from .board_memory import board_memory
from .cache import ocr_cache
from .detector import ocr_detector
from .motion_detector import motion_detector
from .note_builder import note_builder
from .note_cleaner import note_cleaner
from .preprocessor import ocr_preprocessor
from .region import ocr_region
from .text_filter import ocr_text_filter

logger = logging.getLogger(__name__)


class OCRService:

    def process(self, frame, detections=None):
        """Pipeline stage entry point."""
        return self.read(frame, detections or [])

    def read(
        self,
        frame,
        detections,
    ):

        try:

            # --------------------------------------------------
            # Detect Board
            # --------------------------------------------------

            board = board_detector.find_board(
                detections,
            )

            if board:
                logger.debug("Board detected.")
            else:
                logger.debug(
                    "Board not detected. Using fallback region."
                )

            # --------------------------------------------------
            # Crop Board Region
            # --------------------------------------------------

            region = ocr_region.crop(
                frame,
                board,
            )

            # --------------------------------------------------
            # Motion Detection
            # --------------------------------------------------

            if not motion_detector.board_changed(
                region,
            ):

                cached = (
                    ocr_cache.get_cached_result()
                )

                logger.debug(
                    "Board unchanged. Returning cached OCR."
                )

                return cached

            # --------------------------------------------------
            # Image Preprocessing
            # --------------------------------------------------

            processed = (
                ocr_preprocessor.process(
                    region,
                )
            )

            # --------------------------------------------------
            # OCR Detection
            # --------------------------------------------------

            result = ocr_detector.detect(
                processed,
            )

            texts = []
            confidences = []

            if result:

                for page in result:

                    if not page:
                        continue

                    for line in page:

                        if not line:
                            continue

                        try:

                            raw_text = line[1][0]

                            confidence = float(
                                line[1][1]
                            )

                        except Exception:

                            continue

                        cleaned = (
                            note_cleaner.clean(
                                raw_text,
                            ).strip()
                        )

                        if not cleaned:
                            continue

                        if not ocr_text_filter.is_valid(
                            cleaned,
                            confidence,
                        ):
                            continue

                        texts.append(cleaned)

                        confidences.append(
                            confidence
                        )

            # --------------------------------------------------
            # Build Full Text
            # --------------------------------------------------

            full_text = "\n".join(
                texts,
            ).strip()

            # --------------------------------------------------
            # Lecture Notes
            # --------------------------------------------------

            if texts:

                note_builder.add_lines(
                    texts,
                )

            # --------------------------------------------------
            # Average Confidence
            # --------------------------------------------------

            average_confidence = (
                round(
                    sum(confidences)
                    / len(confidences),
                    3,
                )
                if confidences
                else 0.0
            )

            # --------------------------------------------------
            # Board Memory
            # --------------------------------------------------

            memory = board_memory.process(
                full_text,
            )

            # --------------------------------------------------
            # Cache Metadata
            # --------------------------------------------------

            ocr_cache.update_metadata(
                confidence=average_confidence,
                line_count=len(texts),
            )

            output = {

                "text": memory.get(
                    "new_text",
                    "",
                ),

                "full_text": memory.get(
                    "full_text",
                    full_text,
                ),

                "changed": memory.get(
                    "changed",
                    False,
                ),

                "confidence": average_confidence,

                "line_count": len(
                    texts,
                ),
            }

            # --------------------------------------------------
            # Cache OCR Result
            # --------------------------------------------------

            ocr_cache.update_result(
                output,
            )

            logger.debug(

                "OCR extracted %d lines (changed=%s).",

                len(texts),

                output["changed"],
            )

            return output

        except Exception:

            logger.exception(
                "OCR pipeline failed."
            )

            return {

                "text": "",

                "full_text": "",

                "changed": False,

                "confidence": 0.0,

                "line_count": 0,
            }


ocr_service = OCRService()