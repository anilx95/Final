class DashboardMetrics:

    def build(
        self,
        context,
        metrics,
        attendance,
        safety,
    ):

        return {

            "metrics": metrics.__dict__,

            "attendance": attendance,

            "safety": safety,

            "timeline": context.timeline,

        }


dashboard = DashboardMetrics()