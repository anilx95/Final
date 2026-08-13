from app.ai.orchestrator.stage import PipelineStage
from app.ai.navigation_engine import navigation_engine


class NavigationStage(PipelineStage):

    name = "NavigationStage"

    def process(self, context):

        frame_width = getattr(
            context,
            "frame_width",
            640,
        )

        context.navigation = navigation_engine.navigate(
            context.detections,
            frame_width,
        )

        return context