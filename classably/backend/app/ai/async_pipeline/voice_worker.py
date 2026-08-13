import logging
import threading

from queue import Empty

from app.ai.async_pipeline.frame_queue import VOICE_QUEUE

logger = logging.getLogger(__name__)


class VoiceWorker(threading.Thread):

    def __init__(self, speaker):

        super().__init__(daemon=True)

        self.speaker = speaker

        self.stop_event = threading.Event()

    def stop(self):

        self.stop_event.set()

    def run(self):

        logger.info("Voice worker started.")

        while not self.stop_event.is_set():

            try:

                message = VOICE_QUEUE.get(timeout=1)

            except Empty:

                continue

            try:

                if self.speaker is not None:

                    self.speaker.speak(message)

            except Exception:

                logger.exception(
                    "Voice worker failed."
                )

            finally:

                VOICE_QUEUE.task_done()

        logger.info("Voice worker stopped.")