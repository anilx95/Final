from collections import Counter


class InsightGenerator:
    """
    Generates high-level classroom insights from analytics metrics.
    """

    def generate(
        self,
        metrics,
    ):

        insights = []

        # --------------------------
        # Engagement
        # --------------------------

        engagement = metrics.get(
            "engagement_score",
            0,
        )

        if engagement >= 80:

            insights.append(
                {
                    "type": "engagement",
                    "severity": "info",
                    "message": "High classroom engagement.",
                }
            )

        elif engagement >= 50:

            insights.append(
                {
                    "type": "engagement",
                    "severity": "warning",
                    "message": "Moderate classroom engagement.",
                }
            )

        else:

            insights.append(
                {
                    "type": "engagement",
                    "severity": "warning",
                    "message": "Low classroom engagement.",
                }
            )

        # --------------------------
        # Teacher Activity
        # --------------------------

        teacher = metrics.get(
            "teacher_events",
            0,
        )

        if teacher == 0:

            insights.append(
                {
                    "type": "teacher",
                    "severity": "critical",
                    "message": "No teacher activity detected.",
                }
            )

        elif teacher < 5:

            insights.append(
                {
                    "type": "teacher",
                    "severity": "warning",
                    "message": "Teacher activity is low.",
                }
            )

        else:

            insights.append(
                {
                    "type": "teacher",
                    "severity": "info",
                    "message": "Teacher activity is normal.",
                }
            )

        # --------------------------
        # Student Activity
        # --------------------------

        students = metrics.get(
            "student_events",
            0,
        )

        if students == 0:

            insights.append(
                {
                    "type": "students",
                    "severity": "warning",
                    "message": "No student activity detected.",
                }
            )

        elif students < 10:

            insights.append(
                {
                    "type": "students",
                    "severity": "warning",
                    "message": "Low student participation.",
                }
            )

        else:

            insights.append(
                {
                    "type": "students",
                    "severity": "info",
                    "message": "Students are actively participating.",
                }
            )

        # --------------------------
        # Safety
        # --------------------------

        critical = metrics.get(
            "critical_events",
            0,
        )

        if critical > 0:

            insights.append(
                {
                    "type": "safety",
                    "severity": "critical",
                    "message": "Critical safety event detected.",
                }
            )

        high = metrics.get(
            "high_priority_events",
            0,
        )

        if high > 0:

            insights.append(
                {
                    "type": "safety",
                    "severity": "warning",
                    "message": "High priority events require attention.",
                }
            )

        # --------------------------
        # Classroom State
        # --------------------------

        common = metrics.get(
            "most_common_event",
            None,
        )

        if common:

            insights.append(
                {
                    "type": "activity",
                    "severity": "info",
                    "message": f"Most frequent event: {common}.",
                }
            )

        return insights


insights = InsightGenerator()