class SafetyAnalyzer:

    def analyze(
        self,
        context,
    ):

        critical = [

            e

            for e in context.events

            if e.priority == "critical"

        ]

        return {

            "critical_events": len(critical),

            "safe": len(critical) == 0,

        }


safety = SafetyAnalyzer()