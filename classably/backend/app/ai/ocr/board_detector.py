from typing import Optional


class BoardDetector:
    """
    Finds the most suitable board/projector detected by YOLO.
    """

    BOARD_CLASSES = {
        "tv",
        "monitor",
    }

    def find_board(self, detections):

        best = None
        best_area = 0

        for detection in detections:

            if detection["class_name"] not in self.BOARD_CLASSES:
                continue

            x1, y1, x2, y2 = detection["bbox"]

            width = x2 - x1
            height = y2 - y1

            area = width * height

            if area > best_area:
                best = detection
                best_area = area

        return best


board_detector = BoardDetector()