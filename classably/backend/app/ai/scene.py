import logging

from app.ai.distance import estimate_distance

logger = logging.getLogger(__name__)


class SceneAnalyzer:

    def analyze(
        self,
        detections,
    ):

        if detections is None:
            return []

        analyzed = []

        for obj in detections:

            try:

                distance = estimate_distance(obj)

                obj["distance"] = distance

                # -----------------------------
                # Distance Zone
                # -----------------------------
                if distance is None:

                    zone = "unknown"

                elif distance < 1.0:

                    zone = "immediate"

                elif distance < 3.0:

                    zone = "near"

                elif distance < 6.0:

                    zone = "medium"

                else:

                    zone = "far"

                obj["distance_zone"] = zone

                # -----------------------------
                # Collision Score
                # -----------------------------
                if distance is None:

                    score = 0

                else:

                    score = max(
                        0,
                        round(
                            10 - distance,
                            2,
                        ),
                    )

                obj["collision_score"] = score

                analyzed.append(obj)

            except Exception:

                logger.exception(
                    "Scene analysis failed for one object."
                )

        # ----------------------------------
        # Nearest objects first
        # ----------------------------------

        analyzed.sort(
            key=lambda x: x.get(
                "distance",
                float("inf"),
            )
        )

        return analyzed


scene_analyzer = SceneAnalyzer()


def analyze_scene(
    detections,
):
    """
    Backward-compatible wrapper.
    Existing imports do not need to change.
    """
    return scene_analyzer.analyze(
        detections,
    )