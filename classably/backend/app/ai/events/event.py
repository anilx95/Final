from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
import uuid


@dataclass
class AIEvent:

    event_id: str = field(
        default_factory=lambda: str(uuid.uuid4())
    )

    event_type: str = ""

    timestamp: datetime = field(
        default_factory=datetime.utcnow
    )

    classroom_id: int = 0

    confidence: float = 0.0

    priority: str = "normal"

    source: str = "AI"

    payload: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(self):

        return {

            "event_id": self.event_id,

            "event_type": self.event_type,

            "timestamp": self.timestamp.isoformat(),

            "classroom_id": self.classroom_id,

            "confidence": self.confidence,

            "priority": self.priority,

            "source": self.source,

            "payload": self.payload,

        }