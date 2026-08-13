from app.ai.events.event import AIEvent


class EventRules:
    """
    Converts activities and detections into high-level AI events.
    """

    MIN_CONFIDENCE = 0.50

    ACTIVITY_EVENTS = {

        "teacher": {

            "writing_board": ("TeacherStartedWriting", "normal"),

            "walking": ("TeacherMoving", "low"),

            "standing": ("TeacherExplaining", "low"),

        },

        "student": {

            "raising_hand": ("StudentRaisedHand", "normal"),

            "walking": ("StudentMoving", "low"),

            "entering": ("StudentEntered", "normal"),

            "leaving": ("StudentLeft", "normal"),

            "standing": ("StudentStanding", "low"),

        },

    }

    DETECTION_EVENTS = {

        "fire": ("FireDetected", "critical"),

        "smoke": ("SmokeDetected", "critical"),

        "person_fallen": ("EmergencyDetected", "critical"),

        "obstacle": ("ObstacleDetected", "high"),

        "door": ("DoorDetected", "low"),

        "chair": ("ChairDetected", "low"),

        "desk": ("DeskDetected", "low"),

        "table": ("TableDetected", "low"),

        "board": ("BoardDetected", "low"),

        "screen": ("ScreenDetected", "low"),

        "projector": ("ProjectorDetected", "normal"),

        "book": ("BookDetected", "low"),

        "bag": ("BagDetected", "low"),

        "bottle": ("BottleDetected", "low"),

        "laptop": ("LaptopDetected", "low"),

    }

    @classmethod
    def activity_to_event(
        cls,
        activity: dict,
        classroom_id: int,
    ):

        label = activity.get("class_name", "").lower()

        action = activity.get("activity", "")

        confidence = float(
            activity.get("confidence", 0)
        )

        if confidence < cls.MIN_CONFIDENCE:
            return None

        config = cls.ACTIVITY_EVENTS.get(
            label,
            {},
        ).get(action)

        if config is None:
            return None

        event_type, priority = config

        return AIEvent(

            event_type=event_type,

            classroom_id=classroom_id,

            confidence=confidence,

            priority=priority,

            payload=activity,

        )

    @classmethod
    def detection_to_event(
        cls,
        detection: dict,
        classroom_id: int,
    ):

        label = (
            detection.get("class_name")
            or detection.get("class")
            or ""
        ).lower().strip()

        confidence = float(
            detection.get("confidence", 0)
        )

        if confidence < cls.MIN_CONFIDENCE:
            return None

        config = cls.DETECTION_EVENTS.get(label)

        if config is None:
            return None

        event_type, priority = config

        return AIEvent(

            event_type=event_type,

            classroom_id=classroom_id,

            confidence=confidence,

            priority=priority,

            payload=detection,

        )