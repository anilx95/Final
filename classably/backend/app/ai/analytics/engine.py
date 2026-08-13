from app.ai.analytics.insights import insights
from app.ai.analytics.metrics import metrics
from app.ai.analytics.report import report


class AnalyticsEngine:
    """
    Central analytics engine.

    Responsibilities:
    - Calculate raw metrics
    - Generate dashboard report
    - Generate human-readable insights

    This is the only entry point used by AnalyticsStage.
    """

    def analyze(
        self,
        context,
    ):

        # ----------------------------------
        # Calculate metrics
        # ----------------------------------

        calculated_metrics = metrics.calculate(
            context
        )

        # ----------------------------------
        # Generate dashboard report
        # ----------------------------------

        analytics_report = report.generate(
            calculated_metrics
        )

        # ----------------------------------
        # Generate insights
        # ----------------------------------

        analytics_report["insights"] = (
            insights.generate(
                calculated_metrics
            )
        )

        return analytics_report


engine = AnalyticsEngine()