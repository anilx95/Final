class PipelineAnalytics:

    def build(
        self,
        detections,
        processing_time,
        mode,
    ):

        return {
            "mode": mode.value,
            "objects_detected": len(detections),
            "processing_time_ms": processing_time,
        }


pipeline_analytics = PipelineAnalytics()