from app.ai.orchestrator.stage import PipelineStage
from app.ai.ocr.service import ocr_service


class OCRStage(PipelineStage):

    def process(self, context):

        context.ocr_result = ocr_service.process(
            context.frame
        )

        return context