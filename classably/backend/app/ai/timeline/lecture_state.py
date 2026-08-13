from enum import Enum


class LectureState(str, Enum):

    NOT_STARTED = "NOT_STARTED"

    STARTING = "STARTING"

    IN_PROGRESS = "IN_PROGRESS"

    PAUSED = "PAUSED"

    ENDED = "ENDED"