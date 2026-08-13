from collections import defaultdict


class PipelineProfiler:

    def __init__(self):

        self.samples = defaultdict(list)

    def record(self, stage, elapsed_ms):

        self.samples[stage].append(elapsed_ms)

    def average(self, stage):

        values = self.samples.get(stage, [])

        if not values:

            return 0.0

        return round(

            sum(values) / len(values),

            2,

        )

    def minimum(self, stage):

        values = self.samples.get(stage, [])

        if not values:

            return 0.0

        return round(min(values), 2)

    def maximum(self, stage):

        values = self.samples.get(stage, [])

        if not values:

            return 0.0

        return round(max(values), 2)

    def fps(self):

        total = self.average("Pipeline")

        if total == 0:

            return 0.0

        return round(1000 / total, 2)

    def summary(self):

        report = {}

        for stage in self.samples:

            report[stage] = {

                "avg_ms": self.average(stage),

                "min_ms": self.minimum(stage),

                "max_ms": self.maximum(stage),

            }

        report["Pipeline"] = {

            "avg_ms": self.average("Pipeline"),

            "fps": self.fps(),

        }

        return report


profiler = PipelineProfiler()