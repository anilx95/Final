from app.ai.orchestrator.context import PipelineContext
from app.ai.voice.formatter import formatter


class VoiceEngine:
    """
    Voice Engine

    Responsibilities
    ----------------
    - Receive PipelineContext
    - Generate voice messages
    - No TTS playback
    - No navigation logic
    - No event logic
    """

    def generate(
        self,
        context: PipelineContext,
    ):

        return formatter.format(context)


engine = VoiceEngine()