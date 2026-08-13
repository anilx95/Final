import time
from contextlib import ContextDecorator


class StageTimer(ContextDecorator):

    def __init__(self, context, stage_name):

        self.context = context

        self.stage_name = stage_name

        self.start = None

    def __enter__(self):

        self.start = time.perf_counter()

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):

        elapsed = (
            time.perf_counter() - self.start
        ) * 1000

        self.context.timings[self.stage_name] = round(
            elapsed,
            2,
        )

        return False