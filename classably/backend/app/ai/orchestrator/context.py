from dataclasses import dataclass, field
from typing import Any
import time
import uuid


@dataclass(slots=True)
class PipelineContext:
    """
    Shared context passed through every AI pipeline stage.
    """

    # --------------------------------------------------
    # Session
    # --------------------------------------------------

    session_id: str = field(
        default_factory=lambda: str(uuid.uuid4())
    )

    timestamp: float = field(
        default_factory=time.time
    )

    frame_id: int = 0

    camera_name: str | None = None

    classroom_id: int | None = None

    # --------------------------------------------------
    # Input
    # --------------------------------------------------

    image: bytes | None = None

    frame: Any = None

    # --------------------------------------------------
    # Detection
    # --------------------------------------------------

    detections: list = field(default_factory=list)

    filtered_detections: list = field(default_factory=list)

    tracks: list = field(default_factory=list)

    stabilized_tracks: list = field(default_factory=list)

    trajectories: list = field(default_factory=list)

    collisions: list = field(default_factory=list)

    # --------------------------------------------------
    # OCR
    # --------------------------------------------------

    ocr_text: str = ""

    # --------------------------------------------------
    # Activity
    # --------------------------------------------------

    activities: list = field(default_factory=list)

    classroom_state: dict = field(default_factory=dict)

    engagement_score: float = 0.0

    attention_score: float = 0.0

    participation_score: float = 0.0

    # --------------------------------------------------
    # Events
    # --------------------------------------------------

    events: list = field(default_factory=list)

    alerts: list = field(default_factory=list)

    # --------------------------------------------------
    # Timeline
    # --------------------------------------------------

    timeline: list = field(default_factory=list)

    timeline_summary: dict = field(default_factory=dict)

    # --------------------------------------------------
    # Analytics
    # --------------------------------------------------

    analytics: dict = field(default_factory=dict)

    # --------------------------------------------------
    # Navigation
    # --------------------------------------------------

    navigation: Any = None

    # --------------------------------------------------
    # Voice
    # --------------------------------------------------

    voice_messages: list = field(default_factory=list)

    # --------------------------------------------------
    # Performance
    # --------------------------------------------------

    processing_time: float = 0.0

    timings: dict[str, float] = field(default_factory=dict)

    metadata: dict[str, Any] = field(default_factory=dict)

    errors: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.frame is None and self.image is not None:
            import numpy as np
            import cv2
            if isinstance(self.image, np.ndarray):
                self.frame = self.image
            elif isinstance(self.image, (bytes, bytearray)):
                try:
                    np_arr = np.frombuffer(self.image, np.uint8)
                    self.frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                except Exception:
                    pass