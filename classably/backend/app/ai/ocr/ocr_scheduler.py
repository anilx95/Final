import time


class OCRScheduler:

    def __init__(self):

        self.interval = 5.0
        self.last_run = 0.0

    def should_run(self):

        now = time.time()

        if now - self.last_run >= self.interval:
            self.last_run = now
            return True

        return False


ocr_scheduler = OCRScheduler()