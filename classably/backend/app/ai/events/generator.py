import logging
import threading
import time
from typing import Any

from app.ai.events.rules import EventRules

logger = logging.getLogger(__name__)


class EventGenerator:
    """
    Generates high-level AI events from activities and detections
    while suppressing duplicate events.
    """

    def __init__(
        self,
        duplicate_window: float = 5.0,
    ):

        self.duplicate_window = duplicate_window

        # (event_type, classroom_id, track_id)
        self._event_cache: dict[tuple[str, Any, Any], float] = {}

        self._lock = threading.Lock()

    def _cleanup(self):

        now = time.time()

        expired = [

            key

            for key, ts in self._event_cache.items()

            if now - ts > self.duplicate_window

        ]

        for key in expired:

            del self._event_cache[key]

    def _allow_event(

        self,

        event,

        classroom_id,

        track_id,

        now,

    ):

        key = (

            event.event_type,

            classroom_id,

            track_id,

        )

        previous = self._event_cache.get(key)

        if (

            previous is not None

            and now - previous < self.duplicate_window

        ):

            return False

        self._event_cache[key] = now

        return True

    def generate(

        self,

        context,

    ):

        events = []

        now = time.time()

        with self._lock:

            self._cleanup()

            # ==================================
            # Activity Events
            # ==================================

            for activity in context.activities:

                event = EventRules.activity_to_event(

                    activity,

                    context.classroom_id,

                )

                if event is None:

                    continue

                track_id = activity.get(

                    "track_id",

                    -1,

                )

                if self._allow_event(

                    event,

                    context.classroom_id,

                    track_id,

                    now,

                ):

                    events.append(event)

            # ==================================
            # Detection Events
            # ==================================

            for detection in context.detections:

                event = EventRules.detection_to_event(

                    detection,

                    context.classroom_id,

                )

                if event is None:

                    continue

                track_id = detection.get(

                    "track_id",

                    -1,

                )

                if self._allow_event(

                    event,

                    context.classroom_id,

                    track_id,

                    now,

                ):

                    events.append(event)

        logger.info(

            "Generated %d event(s)",

            len(events),

        )

        return events

    def clear(self):

        with self._lock:

            self._event_cache.clear()


generator = EventGenerator()