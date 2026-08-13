from app.ai.orchestrator.pipeline import pipeline


class AIController:

    def process_frame(

        self,

        frame,

        classroom_id=0,

        session_id="",

        camera_id="",

    ):

        context = pipeline.execute(

            frame,

            classroom_id,

            session_id,

            camera_id,

        )

        return context


controller = AIController()