from typing import Dict

# Approximate real-world heights (meters)
KNOWN_HEIGHTS = {
    "person": 1.7,
    "chair": 1.0,
    "bottle": 0.25,
    "laptop": 0.30,
    "backpack": 0.45,
}

# Camera calibration values
FOCAL_LENGTH = 850


def estimate_distance(detection: Dict) -> float | None:

    label = detection["class_name"]

    if label not in KNOWN_HEIGHTS:
        return None

    x1, y1, x2, y2 = detection["bbox"]

    pixel_height = y2 - y1

    if pixel_height <= 0:
        return None

    distance = (
        KNOWN_HEIGHTS[label] * FOCAL_LENGTH
    ) / pixel_height

    return round(distance, 2)