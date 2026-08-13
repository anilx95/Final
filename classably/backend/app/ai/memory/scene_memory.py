import time

from app.ai.config import ANNOUNCE_COOLDOWN


class SceneMemory:

    def __init__(self):

        self.previous_objects = {}

        self.last_announcements = {}

    def _key(self, obj):

        return (
            obj["track_id"],
            obj["class_name"],
        )

    def update(
        self,
        detections,
    ):

        now = time.time()

        events = []

        current = {}

        # --------------------------
        # Current Scene
        # --------------------------

        for obj in detections:

            key = self._key(obj)

            current[key] = obj

            # --------------------------
            # New Object
            # --------------------------

            if key not in self.previous_objects:

                events.append(
                    (
                        "new",
                        obj,
                    )
                )

                continue

            previous = self.previous_objects[key]

            # --------------------------
            # Became Dangerous
            # --------------------------

            if (
                obj.get("collision_warning")
                and not previous.get(
                    "collision_warning",
                    False,
                )
            ):

                events.append(
                    (
                        "danger",
                        obj,
                    )
                )

            # --------------------------
            # Approaching
            # --------------------------

            if (
                obj.get("approaching")
                and not previous.get(
                    "approaching",
                    False,
                )
            ):

                events.append(
                    (
                        "approaching",
                        obj,
                    )
                )

        # --------------------------
        # Removed Objects
        # --------------------------

        for key in self.previous_objects:

            if key not in current:

                events.append(
                    (
                        "gone",
                        self.previous_objects[key],
                    )
                )

        self.previous_objects = current

        # --------------------------
        # Cooldown
        # --------------------------

        filtered = []

        for event, obj in events:

            announce_key = (
                event,
                obj["track_id"],
            )

            last = self.last_announcements.get(
                announce_key,
                0,
            )

            if (
                now - last
                < ANNOUNCE_COOLDOWN
            ):

                continue

            self.last_announcements[
                announce_key
            ] = now

            filtered.append(
                (
                    event,
                    obj,
                )
            )

        return filtered


scene_memory = SceneMemory()