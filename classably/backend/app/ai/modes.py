from enum import Enum


class AIMode(str, Enum):

    CLASSROOM = "classroom"

    NAVIGATION = "navigation"

    READING = "reading"

    ACCESSIBILITY = "accessibility"

    OCR_ONLY = "ocr"

    DETECTION_ONLY = "detection"

    ASSISTIVE = "assistive"

    ANALYTICS = "analytics"

    DEBUG = "debug"