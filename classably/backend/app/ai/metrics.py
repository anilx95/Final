import time


class AIMetrics:

    def __init__(self):
        self.total_frames = 0
        self.total_objects = 0
        self.total_processing_time = 0

    def record(
        self,
        objects,
        processing_time,
    ):
        self.total_frames += 1
        self.total_objects += objects
        self.total_processing_time += processing_time

    def summary(self):
        average = 0

        if self.total_frames:
            average = (
                self.total_processing_time
                / self.total_frames
            )

        return {
            "frames": self.total_frames,
            "objects": self.total_objects,
            "average_processing_ms": round(
                average,
                2,
            ),
        }


ai_metrics = AIMetrics()