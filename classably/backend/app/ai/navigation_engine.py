import logging

from app.ai.collision import collision_level
from app.ai.direction import get_direction
from app.ai.obstacle_priority import obstacle_priority

logger = logging.getLogger(__name__)


class NavigationEngine:

    def navigate(
        self,
        detections,
        frame_width,
    ):

        navigation = []

        if not detections:
            return navigation

        for detection in detections:

            priority = obstacle_priority(detection)

            direction = get_direction(
                detection,
                frame_width,
            )

            collision = collision_level(detection)

            navigation.append(
                {
                    "class": detection.get("class"),
                    "track_id": detection.get("track_id"),
                    "priority": priority,
                    "direction": direction,
                    "collision": collision,
                    "confidence": detection.get(
                        "confidence",
                        0.0,
                    ),
                }
            )

        navigation.sort(
            key=lambda x: x["priority"],
            reverse=True,
        )

        logger.info(
            "Generated %d navigation instructions.",
            len(navigation),
        )

        return navigation


navigation_engine = NavigationEngine()