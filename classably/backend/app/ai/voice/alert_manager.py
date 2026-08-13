import time
import heapq

from app.ai.voice.priorities import AlertPriority


class VoiceAlertManager:

    def __init__(self):

        self.queue = []

        self.last_spoken = {}

        self.cooldown = 4

    def add(self, message, priority):

        now = time.time()

        last = self.last_spoken.get(message)

        if last and now - last < self.cooldown:

            return

        heapq.heappush(

            self.queue,

            (

                priority,

                now,

                message,

            ),

        )

        self.last_spoken[message] = now

    def next_message(self):

        if not self.queue:

            return None

        _, _, message = heapq.heappop(self.queue)

        return message

    def clear(self):

        self.queue.clear()


voice_alert_manager = VoiceAlertManager()