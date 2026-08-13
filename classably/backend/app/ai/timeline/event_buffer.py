from collections import deque


class EventBuffer:

    def __init__(
        self,
        max_events=500,
    ):

        self.buffer = deque(maxlen=max_events)

    def add(
        self,
        event,
    ):

        self.buffer.append(event)

    def latest(
        self,
        limit=50,
    ):

        return list(self.buffer)[-limit:]

    def clear(self):

        self.buffer.clear()


event_buffer = EventBuffer()