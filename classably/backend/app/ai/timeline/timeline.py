from collections import deque

from app.ai.timeline.models import TimelineEvent


class Timeline:

    def __init__(

        self,

        max_events=5000,

    ):

        self.events = deque(

            maxlen=max_events

        )

    def add(

        self,

        event,

    ):

        self.events.append(

            TimelineEvent(

                timestamp=event.timestamp,

                event_type=event.event_type,

                priority=event.priority,

                confidence=event.confidence,

                classroom_id=event.classroom_id,

                payload=event.payload,

            )

        )

    def latest(

        self,

        limit=50,

    ):

        return list(

            self.events

        )[-limit:]

    def clear(self):

        self.events.clear()


timeline = Timeline()