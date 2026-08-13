class StatisticsEngine:

    def summarize(
        self,
        detections,
    ):

        summary = {}

        for obj in detections:

            cls = obj["class"]

            summary[cls] = summary.get(
                cls,
                0,
            ) + 1

        return summary


statistics_engine = StatisticsEngine()