import cv2


class FrameSource:

    def __init__(self):

        self.capture = None

    def open(self, source=0):

        self.capture = cv2.VideoCapture(source)

        return self.capture.isOpened()

    def read(self):

        if self.capture is None:

            return False, None

        return self.capture.read()

    def release(self):

        if self.capture:

            self.capture.release()