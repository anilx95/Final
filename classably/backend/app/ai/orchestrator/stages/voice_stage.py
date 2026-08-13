from app.ai.orchestrator.stage import PipelineStage
from app.ai.voice.message_aggregator import (
    message_aggregator,
)
from app.ai.voice.alert_manager import (
    voice_alert_manager,
)


class VoiceStage(PipelineStage):

    def process(self, context):

        messages = (
            message_aggregator.aggregate(
                context.detections
            )
        )

        for message in messages:

            voice_alert_manager.add(
                message["message"],
                message["priority"],
            )

        context.announcements = []

        while True:

            speech = (
                voice_alert_manager.next_message()
            )

            if speech is None:
                break

            context.announcements.append(
                speech
            )

        return context