import time
from collections import defaultdict


class VoiceAnnouncer:

    def __init__(self):
        self.last_announcements = {}
        self.cooldown = 5

    def _make_key(self, label, direction):
        return f"{label}_{direction}"

    def generate(self, detections):

        now = time.time()

        grouped = defaultdict(list)

        # Group objects by class and direction
        for obj in detections:

            label = obj["class_name"]
            direction = obj.get("direction", "center")

            grouped[(label, direction)].append(obj)

        messages = []

        for (label, direction), objs in grouped.items():

            key = self._make_key(label, direction)

            if (
                key in self.last_announcements
                and now - self.last_announcements[key] < self.cooldown
            ):
                continue

            count = len(objs)

            nearest = min(
                objs,
                key=lambda x: x.get("distance") or 999,
            )

            distance = nearest.get("distance")

            # Single object
            if count == 1:

                if distance is not None:

                    if direction == "center":
                        message = (
                            f"{label} ahead, "
                            f"{distance:.1f} meters."
                        )
                    else:
                        message = (
                            f"{label} on your {direction}, "
                            f"{distance:.1f} meters."
                        )

                else:

                    if direction == "center":
                        message = f"{label} ahead."
                    else:
                        message = f"{label} on your {direction}."

            # Multiple objects
            else:

                if direction == "center":
                    message = (
                        f"{count} {label}s ahead."
                    )
                else:
                    message = (
                        f"{count} {label}s on your {direction}."
                    )

            messages.append(message)

            self.last_announcements[key] = now

        return messages


announcer = VoiceAnnouncer()