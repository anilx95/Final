from app.ai.streaming.frame_source import FrameSource
from app.ai.streaming.frame_processor import processor


class AIStreamingManager:

    def __init__(self):

        self.source = FrameSource()

    def start(

        self,

        source=0,

    ):

        return self.source.open(source)

    def stop(self):

        self.source.release()

    def next_frame(

        self,

        classroom_id=0,

        session_id="",

        camera_id="",

    ):

        ok, frame = self.source.read()

        if not ok:

            return None

        return processor.process(

            frame,

            classroom_id,

            session_id,

            camera_id,

        )


stream_manager = AIStreamingManager()