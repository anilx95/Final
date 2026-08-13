from app.ai.orchestrator.pipeline import pipeline


class FrameProcessor:

    def process(

        self,

        frame,

        classroom_id=0,

        session_id="",

        camera_id="",

    ):

        return pipeline.execute(

            frame,

            classroom_id,

            session_id,

            camera_id,

        )


processor = FrameProcessor()