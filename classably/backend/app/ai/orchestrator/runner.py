import logging
import time

logger = logging.getLogger(__name__)


class PipelineRunner:

    def __init__(self):
        self.stages = []

    def add_stage(self, stage):
        self.stages.append(stage)
        return self

    def run(self, context):

        for stage in self.stages:

            start = time.perf_counter()

            try:

                context = stage.process(context)

            except Exception as exc:

                context.errors.append(
                    {
                        "stage": stage.name,
                        "error": str(exc),
                    }
                )

            elapsed = round(
                (time.perf_counter() - start) * 1000,
                2,
            )

            context.timings[stage.name] = elapsed

        return context