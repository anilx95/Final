import logging
import time

from app.ai.events.dispatcher import dispatcher
from app.ai.events.generator import generator
from app.ai.orchestrator.stage import PipelineStage

logger = logging.getLogger(__name__)


class EventStage(PipelineStage):
    """
    Pipeline stage responsible for generating and dispatching
    high-level AI events from detections and activities.
    """

    name = "EventStage"

    def process(self, context):

        start = time.perf_counter()

        try:

            # Ensure required attributes exist
            if not hasattr(context, "events"):
                context.events = []

            if not hasattr(context, "activities"):
                context.activities = []

            if not hasattr(context, "detections"):
                context.detections = []

            # Generate events from the full pipeline context
            events = generator.generate(context)

            # Dispatch events (updates context internally)
            dispatcher.dispatch(
                context=context,
                events=events,
            )

            elapsed = (
                time.perf_counter() - start
            ) * 1000

            logger.info(
                "%s generated %d event(s) in %.2f ms",
                self.name,
                len(events),
                elapsed,
            )

        except Exception:

            logger.exception("%s failed", self.name)

            # Never stop the pipeline
            context.events = []

        return context