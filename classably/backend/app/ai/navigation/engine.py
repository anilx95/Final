from app.ai.navigation.planner import planner


class NavigationEngine:
    """
    Navigation Engine

    Responsibilities:
    - Receive the current PipelineContext
    - Invoke the NavigationPlanner
    - Return a NavigationResult

    No navigation logic should exist here.
    """

    def navigate(
        self,
        context,
    ):

        return planner.plan(
            context
        )


engine = NavigationEngine()