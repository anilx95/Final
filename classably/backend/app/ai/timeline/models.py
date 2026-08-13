from dataclasses import dataclass, field
import time


@dataclass
class TimelineEvent:

    timestamp: float = field(default_factory=time.time)

    event_type: str = ""

    priority: str = "low"

    confidence: float = 0.0

    classroom_id: int = 0

    payload: dict = field(default_factory=dict)