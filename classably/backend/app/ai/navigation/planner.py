from app.ai.navigation.models import NavigationResult
from app.ai.navigation.rules import (
    SAFE_DISTANCE,
    WARNING_DISTANCE,
    CRITICAL_DISTANCE,
)


class NavigationPlanner:
    """
    Computes navigation decisions using collision analysis
    and tracked obstacle information.
    """

    def plan(
        self,
        context,
    ) -> NavigationResult:

        result = NavigationResult()

        # -----------------------------------------
        # Get collision list
        # -----------------------------------------

        collisions = getattr(
            context,
            "collisions",
            None,
        )

        # Fallback for current pipeline
        if collisions is None:

            collisions = []

            for detection in getattr(
                context,
                "detections",
                [],
            ):

                if detection.get(
                    "collision_risk",
                    False,
                ):

                    collisions.append(
                        {
                            "distance": detection.get(
                                "distance",
                                float("inf"),
                            ),
                            "direction": detection.get(
                                "direction",
                                "front",
                            ),
                            "class_name": detection.get(
                                "class_name",
                                "obstacle",
                            ),
                            "confidence": detection.get(
                                "class_confidence",
                                1.0,
                            ),
                        }
                    )

        # -----------------------------------------
        # No obstacle
        # -----------------------------------------

        if not collisions:

            result.warning_level = "none"
            result.recommended_action = "Continue"
            result.safe_direction = "forward"
            result.tts_message = "Path is clear."

            return result

        # -----------------------------------------
        # Nearest obstacle
        # -----------------------------------------

        nearest = min(
            collisions,
            key=lambda c: c.get(
                "distance",
                float("inf"),
            ),
        )

        distance = nearest.get(
            "distance",
            float("inf"),
        )

        direction = nearest.get(
            "direction",
            "front",
        )

        label = nearest.get(
            "class_name",
            "obstacle",
        )

        confidence = nearest.get(
            "confidence",
            1.0,
        )

        result.distance_to_obstacle = distance
        result.obstacle_class = label
        result.confidence = confidence
        result.blocked_paths.append(direction)

        # -----------------------------------------
        # Critical
        # -----------------------------------------

        if distance <= CRITICAL_DISTANCE:

            result.warning_level = "critical"
            result.recommended_action = "Stop"
            result.safe_direction = "back"

            result.tts_message = (
                f"Stop. {label} very close."
            )

            return result

        # -----------------------------------------
        # High Risk
        # -----------------------------------------

        if distance <= WARNING_DISTANCE:

            result.warning_level = "high"

            if direction == "left":

                result.safe_direction = "right"
                result.recommended_action = "Turn Right"

            elif direction == "right":

                result.safe_direction = "left"
                result.recommended_action = "Turn Left"

            else:

                result.safe_direction = "left"
                result.recommended_action = "Turn Left"

            result.tts_message = (
                f"{label} ahead. "
                f"{result.recommended_action}."
            )

            return result

        # -----------------------------------------
        # Medium Risk
        # -----------------------------------------

        if distance <= SAFE_DISTANCE:

            result.warning_level = "medium"
            result.recommended_action = (
                "Proceed Carefully"
            )
            result.safe_direction = "forward"

            result.tts_message = (
                f"{label} nearby. Proceed carefully."
            )

            return result

        # -----------------------------------------
        # Safe
        # -----------------------------------------

        result.warning_level = "low"
        result.recommended_action = "Continue"
        result.safe_direction = "forward"

        result.tts_message = (
            "Continue forward."
        )

        return result


planner = NavigationPlanner()