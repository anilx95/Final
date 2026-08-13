import logging

from app.ai.async_pipeline.pipeline_worker import PipelineWorker
from app.ai.async_pipeline.voice_worker import VoiceWorker

logger = logging.getLogger(__name__)


class AsyncManager:

    def __init__(self, speaker=None):

        self.pipeline_worker = PipelineWorker()

        self.voice_worker = (
            VoiceWorker(speaker)
            if speaker is not None
            else None
        )

    def start(self):

        logger.info("Starting async workers...")

        if not self.pipeline_worker.is_alive():
            self.pipeline_worker.start()

        if (
            self.voice_worker
            and not self.voice_worker.is_alive()
        ):
            self.voice_worker.start()

        logger.info("Async workers started.")

    def stop(self):

        logger.info("Stopping async workers...")

        self.pipeline_worker.stop()

        if self.voice_worker:
            self.voice_worker.stop()

        # Wait for threads to exit
        self.pipeline_worker.join(timeout=5)

        if self.voice_worker:
            self.voice_worker.join(timeout=5)

        logger.info("Async workers stopped.")

    def health(self):

        return {
            "pipeline_worker": self.pipeline_worker.is_alive(),
            "voice_worker": (
                self.voice_worker.is_alive()
                if self.voice_worker
                else False
            ),
        }