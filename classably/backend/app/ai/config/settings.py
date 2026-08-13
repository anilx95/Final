from dataclasses import dataclass


@dataclass
class AISettings:

    # ---------------------------------
    # Detection
    # ---------------------------------

    detection_confidence: float = 0.50
    max_detections: int = 100

    # Duplicate Filtering
    enable_duplicate_filter: bool = True
    iou_threshold: float = 0.50

    # ---------------------------------
    # Tracking
    # ---------------------------------

    tracker_max_age: int = 30
    tracker_min_hits: int = 3

    # ---------------------------------
    # Events
    # ---------------------------------

    duplicate_event_window: float = 5.0

    # ---------------------------------
    # OCR
    # ---------------------------------

    enable_ocr: bool = True

    # ---------------------------------
    # Voice
    # ---------------------------------

    enable_voice: bool = True

    # ---------------------------------
    # Navigation
    # ---------------------------------

    enable_navigation: bool = True

    # ---------------------------------
    # Analytics
    # ---------------------------------

    enable_analytics: bool = True

    # ---------------------------------
    # Timeline
    # ---------------------------------

    enable_timeline: bool = True

    # ---------------------------------
    # Performance
    # ---------------------------------

    target_fps: int = 30