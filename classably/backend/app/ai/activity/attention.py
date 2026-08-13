class AttentionAnalyzer:

    def analyze(self, detections):

        report = []

        for obj in detections:

            if obj["class_name"] != "person":

                continue

            attentive = obj.get(
                "velocity",
                0,
            ) < 30

            report.append(
                {
                    "track_id": obj["track_id"],
                    "attentive": attentive,
                }
            )

        return report


attention_analyzer = AttentionAnalyzer()