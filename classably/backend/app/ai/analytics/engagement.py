from app.ai.analytics.metrics import ClassroomMetrics


class EngagementAnalyzer:

    def analyze(
        self,
        context,
    ) -> ClassroomMetrics:

        metrics = ClassroomMetrics()

        metrics.teacher_count = sum(
            1
            for e in context.events
            if e.event_type == "TeacherDetected"
        )

        metrics.student_count = sum(
            1
            for e in context.events
            if e.event_type == "StudentDetected"
        )

        metrics.total_events = len(context.events)

        if metrics.student_count > 0:
            metrics.engagement_score = min(
                100.0,
                metrics.student_count * 10,
            )

        return metrics


engagement = EngagementAnalyzer()