from app.ai.config.settings import AISettings
from app.ai.config.runtime import RuntimeState


class AIConfigManager:

    def __init__(self):

        self.settings = AISettings()

        self.runtime = RuntimeState()

    def update_runtime(

        self,

        fps,

        latency,

    ):

        self.runtime.fps = fps

        self.runtime.latency = latency

        self.runtime.frames_processed += 1

    def reset_runtime(self):

        self.runtime = RuntimeState()


config = AIConfigManager()