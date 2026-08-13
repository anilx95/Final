from datetime import datetime


class TimelineBuilder:
    """
    Builds a clean chronological timeline by merging
    consecutive duplicate events from the same object.
    """

    def build(
        self,
        events,
    ):

        if not events:
            return []

        timeline = []

        previous = None

        for event in sorted(
            events,
            key=lambda e: e.timestamp,
        ):

            timestamp = event.timestamp

            if isinstance(timestamp, datetime):
                dt = timestamp
            else:
                dt = datetime.fromtimestamp(timestamp)

            track_id = (
                event.payload.get("track_id")
                if isinstance(event.payload, dict)
                else None
            )

            # Merge consecutive identical events
            if (
                previous is not None
                and previous["event"] == event.event_type
                and previous["track_id"] == track_id
            ):

                previous["end_time"] = dt.strftime("%H:%M:%S")
                previous["duration"] += 1
                previous["confidence"] = max(
                    previous["confidence"],
                    event.confidence,
                )
                continue

            previous = {

                "start_time": dt.strftime("%H:%M:%S"),

                "end_time": dt.strftime("%H:%M:%S"),

                "duration": 0,

                "event": event.event_type,

                "priority": event.priority,

                "confidence": round(
                    event.confidence,
                    2,
                ),

                "track_id": track_id,

                "payload": event.payload,

            }

            timeline.append(previous)

        return timeline


timeline_builder = TimelineBuilder()