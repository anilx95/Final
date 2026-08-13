import logging
import time

from app.ai.navigation.engine import engine
from app.ai.orchestrator.stage import PipelineStage

logger = logging.getLogger(__name__)


class NavigationStage(PipelineStage):

    name = "NavigationStage"

    def process(
        self,
        context,
    ):

        start = time.perf_counter()

        try:

            navigation = engine.navigate(
                context
            )

            context.navigation = navigation

            if hasattr(context, "metadata"):

                context.metadata[
                    "navigation_ready"
                ] = True

            elapsed = (
                time.perf_counter() - start
            ) * 1000

            logger.info(

                "%s completed in %.2f ms",

                self.name,

                elapsed,

            )

        except Exception:

            logger.exception(

                "%s failed",

                self.name,

            )

            context.navigation = None

        return context