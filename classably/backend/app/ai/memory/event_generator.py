from app.ai.voice.alert_manager import (
    voice_alert_manager,
)

from app.ai.voice.priorities import (
    AlertPriority,
)


class EventGenerator:

    def build(self, events):

        for event, obj in events:

            label = obj.get("class_name", "Object")

            direction = obj.get("movement", "ahead")

            # -----------------------------
            # New Object
            # -----------------------------
            if event == "new":

                voice_alert_manager.add(
                    f"{label} detected.",
                    AlertPriority.LOW,
                )

            # -----------------------------
            # Collision Warning
            # -----------------------------
            elif event == "danger":

                voice_alert_manager.add(
                    f"Warning. {label} {direction}.",
                    AlertPriority.CRITICAL,
                )

            # -----------------------------
            # Approaching Object
            # -----------------------------
            elif event == "approaching":

                voice_alert_manager.add(
                    f"{label} approaching.",
                    AlertPriority.HIGH,
                )

            # -----------------------------
            # Object Removed
            # -----------------------------
            elif event == "gone":

                voice_alert_manager.add(
                    f"{label} cleared.",
                    AlertPriority.MEDIUM,
                )

        spoken = []

        while True:

            message = voice_alert_manager.next_message()

            if message is None:
                break

            spoken.append(message)

        return spoken


event_generator = EventGenerator()