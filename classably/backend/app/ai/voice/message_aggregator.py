from collections import defaultdict


class MessageAggregator:

    def aggregate(self, detections):

        grouped = defaultdict(list)

        for detection in detections:

            grouped[detection["class_name"]].append(
                detection
            )

        messages = []

        for label, objects in grouped.items():

            count = len(objects)

            approaching = sum(
                1
                for obj in objects
                if obj.get("approaching", False)
            )

            collision = sum(
                1
                for obj in objects
                if obj.get("collision_risk", False)
            )

            if collision:

                messages.append(
                    {
                        "priority": "critical",
                        "message": (
                            f"{collision} {label}"
                            + ("s" if collision > 1 else "")
                            + " may collide."
                        ),
                    }
                )

            elif approaching:

                messages.append(
                    {
                        "priority": "high",
                        "message": (
                            f"{approaching} {label}"
                            + ("s" if approaching > 1 else "")
                            + " approaching."
                        ),
                    }
                )

            else:

                messages.append(
                    {
                        "priority": "low",
                        "message": (
                            f"{count} {label}"
                            + ("s" if count > 1 else "")
                            + " detected."
                        ),
                    }
                )

        return messages


message_aggregator = MessageAggregator()