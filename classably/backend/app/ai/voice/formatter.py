from app.ai.voice.models import VoiceMessage


class VoiceFormatter:
    """
    Converts pipeline outputs into voice messages.
    """

    def format(
        self,
        context,
    ):

        messages = []

        # -----------------------------
        # Navigation
        # -----------------------------
        navigation = getattr(
            context,
            "navigation",
            None,
        )

        if (
            navigation
            and navigation.tts_message
        ):

            messages.append(

                VoiceMessage(

                    message=navigation.tts_message,

                    priority=navigation.warning_level,

                    interrupt=(
                        navigation.warning_level
                        == "critical"
                    ),

                    source="navigation",

                )

            )

        # -----------------------------
        # OCR
        # -----------------------------
        ocr_text = getattr(
            context,
            "ocr_text",
            "",
        )

        if ocr_text:

            messages.append(

                VoiceMessage(

                    message=ocr_text,

                    priority="normal",

                    source="ocr",

                )

            )

        # -----------------------------
        # Critical Events
        # -----------------------------
        for event in getattr(
            context,
            "events",
            [],
        ):

            if event.priority == "critical":

                messages.append(

                    VoiceMessage(

                        message=event.event_type,

                        priority="critical",

                        interrupt=True,

                        source="event",

                    )

                )

        return messages


formatter = VoiceFormatter()