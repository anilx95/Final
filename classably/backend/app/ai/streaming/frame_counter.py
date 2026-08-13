import time


class FrameCounter:

    def __init__(self):

        self.frames = 0

        self.start = time.time()

    def tick(self):

        self.frames += 1

    def fps(self):

        elapsed = time.time() - self.start

        if elapsed == 0:

            return 0

        return round(
            self.frames / elapsed,
            2,
        )


frame_counter = FrameCounter()