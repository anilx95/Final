"""
Voice Controlled Classroom - Intent Parser
"""

import re


INTENT_PATTERNS = [

    ("open_notes", [
        r"\bopen notes?\b",
        r"\bshow notes?\b",
    ]),

    ("increase_font", [
        r"\bincrease font\b",
        r"\bbigger text\b",
        r"\bfont size up\b",
    ]),

    ("decrease_font", [
        r"\bdecrease font\b",
        r"\bsmaller text\b",
        r"\bfont size down\b",
    ]),

    ("read_slide", [
        r"\bread slide\b(?:\s*(?:number)?\s*(\d+))?"
    ]),

    # -------------------------
    # LIGHTS
    # -------------------------
    ("lights_on", [
        r"\bturn on (?:the )?lights?\b",
        r"\blights? on\b",
    ]),

    ("lights_off", [
        r"\bturn off (?:the )?lights?\b",
        r"\blights? off\b",
    ]),

    # -------------------------
    # FAN
    # -------------------------
    ("fan_on", [
        r"\bturn on (?:the )?fans?\b",
        r"\bfans? on\b",
    ]),

    ("fan_off", [
        r"\bturn off (?:the )?fans?\b",
        r"\bfans? off\b",
    ]),

    # -------------------------
    # CURTAINS
    # -------------------------
    ("curtains_open", [
        r"\bopen (?:the )?curtains?\b",
    ]),

    ("curtains_close", [
        r"\bclose (?:the )?curtains?\b",
    ]),

    # -------------------------
    # DESK
    # -------------------------
    ("desk_up", [
        r"\braise (?:the )?desk\b",
        r"\bdesk up\b",
    ]),

    ("desk_down", [
        r"\blower (?:the )?desk\b",
        r"\bdesk down\b",
    ]),

    # -------------------------
    # SLIDES
    # -------------------------
    ("next_slide", [
        r"\bnext slide\b",
    ]),

    ("previous_slide", [
        r"\bprevious slide\b",
        r"\bback slide\b",
        r"\bgo back\b",
    ]),

    # -------------------------
    # ZOOM
    # -------------------------
    ("zoom_in", [
        r"\bzoom in\b",
        r"\bzoom\b",
    ]),

    ("highlight_text", [
        r"\bhighlight\b",
    ]),

    # -------------------------
    # CALL TEACHER
    # -------------------------
    ("call_teacher", [
        r"\bcall teacher\b",
        r"\bneed (?:help|assistance)\b",
        r"\bassist\b",
    ]),

    # -------------------------
    # NAVIGATION
    # -------------------------
    ("navigate_to", [
        r"\b(?:go to|navigate to|take me to)\s+(.+)"
    ]),
]


def parse_intent(text: str):

    t = text.lower().strip()

    for intent, patterns in INTENT_PATTERNS:

        for pattern in patterns:

            match = re.search(pattern, t)

            if match:

                parameters = {}

                if intent == "read_slide" and match.lastindex:
                    if match.group(1):
                        parameters["slide_number"] = int(match.group(1))

                if intent == "navigate_to" and match.lastindex:
                    if match.group(1):
                        parameters["destination"] = match.group(1).strip()

                return {
                    "intent": intent,
                    "parameters": parameters,
                    "matched": True,
                }

    return {
        "intent": "unknown",
        "parameters": {
            "raw": text,
        },
        "matched": False,
    }