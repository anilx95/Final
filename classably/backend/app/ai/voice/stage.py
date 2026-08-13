import logging
import time

from app.ai.orchestrator.stage import PipelineStage
from app.ai.voice.engine import engine

logger = logging.getLogger(__name__)


class VoiceStage(PipelineStage):

    name = "VoiceStage"

    def process(
        self,
        context,
    ):

        start = time.perf_counter()

        try:

            messages = engine.generate(
                context
            )

            context.voice_messages = messages

            if hasattr(context, "metadata"):

                context.metadata[
                    "voice_ready"
                ] = True

            logger.info(

                "%s generated %d message(s) in %.2f ms",

                self.name,

                len(messages),

                (time.perf_counter() - start) * 1000,

            )

        except Exception:

            logger.exception(

                "%s failed",

                self.name,

            )

            context.voice_messages = []

        return context