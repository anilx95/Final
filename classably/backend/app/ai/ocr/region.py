from .config import (
    OCR_REGION_TOP,
    OCR_REGION_BOTTOM,
    OCR_REGION_LEFT,
    OCR_REGION_RIGHT,
)

import cv2


class OCRRegion:

    def crop(self, frame, board=None):
        """
        Crop the OCR region.

        Priority:
        1. Use YOLO detected board/TV bounding box.
        2. Fallback to configured percentage crop.
        """

        # -------------------------------
        # Dynamic crop using YOLO
        # -------------------------------
        if board is not None:

            x1, y1, x2, y2 = board["bbox"]

            # Add small padding
            padding = 20

            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(frame.shape[1], x2 + padding)
            y2 = min(frame.shape[0], y2 + padding)

            crop = frame[y1:y2, x1:x2]

            # Save for debugging
            cv2.imwrite("debug_board_crop.jpg", crop)

            return crop

        # -------------------------------
        # Fallback crop
        # -------------------------------
        h, w = frame.shape[:2]

        top = int(h * OCR_REGION_TOP)
        bottom = int(h * OCR_REGION_BOTTOM)

        left = int(w * OCR_REGION_LEFT)
        right = int(w * OCR_REGION_RIGHT)

        crop = frame[top:bottom, left:right]

        cv2.imwrite("debug_fallback_crop.jpg", crop)

        return crop


ocr_region = OCRRegion()