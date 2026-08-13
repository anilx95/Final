from dataclasses import dataclass, field
import time


@dataclass
class PersonState:

    track_id: int

    label: str

    current_activity: str = "unknown"

    previous_activity: str = "unknown"

    confidence: float = 0.0

    sitting_frames: int = 0

    standing_frames: int = 0

    moving_frames: int = 0

    hand_raised_frames: int = 0

    near_board_frames: int = 0

    entering_frames: int = 0

    leaving_frames: int = 0

    first_seen: float = field(default_factory=time.time)

    last_seen: float = field(default_factory=time.time)