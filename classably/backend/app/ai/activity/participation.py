class ParticipationAnalyzer:

    def analyze(self, detections):

        events = []

        for obj in detections:

            if obj["class_name"] != "person":

                continue

            if obj.get("raised_hand", False):

                events.append(
                    {
                        "type": "raised_hand",
                        "track_id": obj["track_id"],
                    }
                )

        return events


participation_analyzer = ParticipationAnalyzer()