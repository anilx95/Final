import time


class FrameScheduler:

    def __init__(self):

        self.last_time = 0

    def should_process(
        self,
        interval_ms,
    ):

        now = time.time()

        if (
            now - self.last_time
        ) * 1000 >= interval_ms:

            self.last_time = now

            return True

        return False


frame_scheduler = FrameScheduler()