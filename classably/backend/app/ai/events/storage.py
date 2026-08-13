import logging
import threading
from collections import deque
from typing import Optional

logger = logging.getLogger(__name__)


class EventStorage:
    """
    Thread-safe in-memory event storage.

    This acts as a fast cache for recent events.
    Long-term persistence should be handled by
    the database through EventRepository.
    """

    def __init__(
        self,
        max_events: int = 1000,
    ):

        self._events = deque(maxlen=max_events)

        self._lock = threading.Lock()

    def save(
        self,
        event,
    ):

        with self._lock:

            self._events.append(event)

        logger.info(
            "Stored event: %s",
            event.event_type,
        )

    def latest(
        self,
        limit: int = 20,
    ):

        with self._lock:

            return list(self._events)[-limit:]

    def by_priority(
        self,
        priority: str,
    ):

        with self._lock:

            return [

                event

                for event in self._events

                if event.priority == priority

            ]

    def by_classroom(
        self,
        classroom_id: int,
    ):

        with self._lock:

            return [

                event

                for event in self._events

                if event.classroom_id == classroom_id

            ]

    def find(
        self,
        event_id: str,
    ) -> Optional[object]:

        with self._lock:

            for event in self._events:

                if event.event_id == event_id:

                    return event

        return None

    def count(self):

        with self._lock:

            return len(self._events)

    def clear(self):

        with self._lock:

            self._events.clear()

        logger.info(
            "Event storage cleared."
        )

    def stats(self):

        with self._lock:

            priorities = {}

            for event in self._events:

                priorities[event.priority] = (

                    priorities.get(

                        event.priority,

                        0,

                    )

                    + 1

                )

            return {

                "cached_events": len(self._events),

                "priority_distribution": priorities,

            }


storage = EventStorage()