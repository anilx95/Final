import cv2
import numpy as np


class OCRMotionDetector:

    def __init__(self):

        self.previous = None

        # percentage of pixels that must change
        self.threshold = 2.0

    def board_changed(self, image):

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        gray = cv2.resize(
            gray,
            (400, 250),
        )

        if self.previous is None:

            self.previous = gray

            return True

        diff = cv2.absdiff(
            self.previous,
            gray,
        )

        changed_pixels = np.count_nonzero(diff > 25)

        percentage = (
            changed_pixels
            / diff.size
        ) * 100

        self.previous = gray

        print("=" * 70)
        print(f"Board Difference : {percentage:.2f}%")
        print("=" * 70)

        return percentage > self.threshold


motion_detector = OCRMotionDetector()