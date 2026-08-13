import logging
import time

from app.ai.orchestrator.stage import PipelineStage

from app.ai.timeline.event_buffer import event_buffer
from app.ai.timeline.timeline_builder import timeline_builder
from app.ai.timeline.summary import summary

logger = logging.getLogger(__name__)


class TimelineStage(PipelineStage):

    name = "TimelineStage"

    def process(
        self,
        context,
    ):

        start = time.perf_counter()

        try:

            if not hasattr(context, "events"):
                context.events = []

            # ------------------------------------
            # Add new events to buffer
            # ------------------------------------

            for event in context.events:

                event_buffer.add(event)

            # ------------------------------------
            # Build timeline
            # ------------------------------------

            timeline = timeline_builder.build(
                event_buffer.latest()
            )

            context.timeline = timeline

            # ------------------------------------
            # Build summary
            # ------------------------------------

            context.timeline_summary = summary.generate(
                timeline
            )

            # ------------------------------------
            # Metadata
            # ------------------------------------

            if hasattr(context, "metadata"):

                context.metadata["timeline_events"] = len(
                    timeline
                )

            elapsed = (
                time.perf_counter() - start
            ) * 1000

            logger.info(

                "%s updated (%d events) in %.2f ms",

                self.name,

                len(timeline),

                elapsed,

            )

        except Exception:

            logger.exception(
                "%s failed",
                self.name,
            )

            context.timeline = []
            context.timeline_summary = {}

        return context