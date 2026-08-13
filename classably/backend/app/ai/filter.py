from typing import List

from app.ai.config.manager import config

# Classes that are not useful inside a classroom
IGNORED_CLASSES = {
    "tie",
    "toothbrush",
    "hair drier",
}


def _calculate_iou(box1, box2):
    """
    Calculate Intersection over Union (IoU)
    """

    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])

    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_width = max(0, x2 - x1)
    inter_height = max(0, y2 - y1)

    intersection = inter_width * inter_height

    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union = area1 + area2 - intersection

    if union <= 0:
        return 0.0

    return intersection / union


def filter_detections(detections: List[dict]) -> List[dict]:
    """
    Filter detections based on confidence,
    ignored classes and duplicate removal.
    """

    filtered = []

    # ---------------------------------
    # Confidence + Ignored Classes
    # ---------------------------------

    for detection in detections:

        if detection["confidence"] < config.settings.detection_confidence:
            continue

        if detection["class_name"] in IGNORED_CLASSES:
            continue

        filtered.append(detection)

    # ---------------------------------
    # Highest confidence first
    # ---------------------------------

    filtered.sort(
        key=lambda x: x["confidence"],
        reverse=True,
    )

    # ---------------------------------
    # Duplicate Filtering
    # ---------------------------------

    if not getattr(config.settings, "enable_duplicate_filter", True):
        return filtered

    final = []

    iou_threshold = getattr(
        config.settings,
        "iou_threshold",
        0.50,
    )

    for detection in filtered:

        duplicate = False

        for kept in final:

            if kept["class_name"] != detection["class_name"]:
                continue

            iou = _calculate_iou(
                kept["bbox"],
                detection["bbox"],
            )

            if iou > iou_threshold:
                duplicate = True
                break

        if not duplicate:
            final.append(detection)

    return final